import { Prisma, type RolUsuario } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ownedEventWhere,
  participatingContractWhere,
} from "@/lib/authorization";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { createNotification } from "@/lib/notification-access";
import { validarDisponibilidadMusico } from "@/lib/disponibilidad";
import { validarDisponibilidadCupo } from "@/lib/cupos";
import {
  validarCancelacionContratacion,
  validarFinalizacionContratacion,
} from "@/lib/contrataciones";

export const contractListInclude = {
  evento: {
    select: {
      id: true,
      titulo: true,
      startsAt: true,
      endsAt: true,
      ubicacion: true,
      nombreLugar: true,
      ciudad: true,
      estado: true,
    },
  },
  proyectoMusical: {
    select: {
      id: true,
      nombre: true,
      genero: true,
      imagenUrl: true,
    },
  },
  organizador: {
    select: { id: true, nombre: true, apellido: true },
  },
  musico: {
    select: { id: true, nombre: true, apellido: true },
  },
  ofertas: {
    orderBy: { creadoEn: "desc" as const },
    take: 1,
  },
} satisfies Prisma.ContratacionInclude;

export const contractDetailInclude = {
  evento: true,
  proyectoMusical: true,
  organizador: {
    select: { id: true, nombre: true, apellido: true, email: true },
  },
  musico: {
    select: { id: true, nombre: true, apellido: true, email: true },
  },
  ofertas: {
    orderBy: { creadoEn: "asc" as const },
    include: {
      remitente: {
        select: { id: true, nombre: true, apellido: true, rol: true },
      },
    },
  },
  valoraciones: true,
} satisfies Prisma.ContratacionInclude;

export function contractsForUserWhere(
  role: RolUsuario,
  userId: string
): Prisma.ContratacionWhereInput {
  return role === "ORGANIZADOR"
    ? { organizadorId: userId }
    : { musicoId: userId };
}

export async function createDirectContract(input: {
  eventId: string;
  projectId: string;
  organizerId: string;
  initialOfferAmount?: number;
  initialMessage?: string;
}) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const event = await tx.evento.findFirst({
          where: ownedEventWhere(input.eventId, input.organizerId),
          include: {
            contrataciones: {
              select: { estado: true },
            },
          },
        });
        if (!event) throw new NotFoundError("Evento");

        if (event.estado !== "PUBLICADO") {
          throw new ConflictError(
            "El evento no está disponible para contrataciones"
          );
        }

        if (new Date() >= event.endsAt) {
          throw new ConflictError("El evento ya finalizó");
        }

        const capacity = validarDisponibilidadCupo({
          cantidadRequerida: event.cantidadMusicosRequerida,
          contrataciones: event.contrataciones,
        });
        if (!capacity.ok) {
          throw new ConflictError("El evento no tiene cupos disponibles");
        }

        const project = await tx.proyectoMusical.findUnique({
          where: { id: input.projectId },
        });
        if (!project) throw new NotFoundError("Proyecto musical");
        if (!project.estaActivo) {
          throw new ConflictError("El proyecto musical no está activo");
        }

        const [existingPostulation, existingContract] = await Promise.all([
          tx.postulacion.findUnique({
            where: {
              eventoId_proyectoMusicalId: {
                eventoId: event.id,
                proyectoMusicalId: project.id,
              },
            },
            select: { id: true },
          }),
          tx.contratacion.findUnique({
            where: {
              eventoId_proyectoMusicalId: {
                eventoId: event.id,
                proyectoMusicalId: project.id,
              },
            },
            select: { id: true },
          }),
        ]);

        if (existingPostulation || existingContract) {
          throw new ConflictError(
            "Ya existe una postulación o contratación previa para este proyecto en este evento"
          );
        }

        const activeContracts = await tx.contratacion.findMany({
          where: {
            musicoId: project.usuarioId,
            estado: { in: ["NEGOCIANDO", "ACORDADO"] },
          },
          include: {
            evento: {
              select: { titulo: true, startsAt: true, endsAt: true },
            },
          },
        });

        const availability = validarDisponibilidadMusico({
          nuevoEvento: { startsAt: event.startsAt, endsAt: event.endsAt },
          contratacionesExistentes: activeContracts,
        });
        if (!availability.ok) {
          throw new ConflictError("El músico no está disponible en ese horario");
        }

        const initialOfferAmount =
          input.initialOfferAmount !== undefined && input.initialOfferAmount > 0
            ? input.initialOfferAmount
            : null;

        const contract = await tx.contratacion.create({
          data: {
            eventoId: event.id,
            proyectoMusicalId: project.id,
            organizadorId: input.organizerId,
            musicoId: project.usuarioId,
            creadoPorId: input.organizerId,
            estado: "NEGOCIANDO",
            ofertas: initialOfferAmount !== null
              ? {
                  create: {
                    remitenteId: input.organizerId,
                    monto: initialOfferAmount,
                    mensaje: input.initialMessage || null,
                    estado: "PROPUESTA",
                  },
                }
              : undefined,
          },
          include: {
            evento: true,
            proyectoMusical: true,
            ofertas: true,
          },
        });

        if (project.usuarioId !== input.organizerId) {
          await createNotification(tx, {
            usuarioId: project.usuarioId,
            tipo: "INVITACION_RECIBIDA",
            titulo: "Nueva invitación recibida",
            mensaje: `Recibiste una invitación para participar con "${project.nombre}" en el evento "${event.titulo}".`,
            enlace: "/dashboard/musician",
          });
        }

        return contract;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictError(
        "Ya existe una postulación o contratación previa para este proyecto en este evento"
      );
    }
    throw error;
  }
}

export async function cancelParticipatingContract(input: {
  contractId: string;
  userId: string;
  cancellationReason?: string | null;
}) {
  const contract = await prisma.contratacion.findFirst({
    where: participatingContractWhere(input.contractId, input.userId),
    include: { evento: true },
  });
  if (!contract) throw new NotFoundError("Contratación");

  const now = new Date();
  const validation = validarCancelacionContratacion({
    contratacion: contract,
    evento: contract.evento,
    usuarioId: input.userId,
    ahora: now,
  });

  if (!validation.ok) {
    switch (validation.motivo) {
      case "CONTRATACION_YA_CANCELADA":
        throw new ConflictError("La contratación ya está cancelada");
      case "CONTRATACION_YA_COMPLETADA":
        throw new ConflictError(
          "La contratación ya está completada y no puede cancelarse"
        );
      case "EVENTO_YA_COMENZO_NO_SE_PUEDE_CANCELAR_ACUERDO":
        throw new ConflictError(
          "No se puede cancelar una contratación acordada cuando el evento ya comenzó"
        );
      case "USUARIO_NO_PARTICIPANTE":
        // La participación ya forma parte de la consulta y este caso es inalcanzable.
        throw new NotFoundError("Contratación");
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.contratacion.update({
      where: { id: contract.id },
      data: {
        estado: "CANCELADO",
        fechaCancelacion: now,
        motivoCancelacion: input.cancellationReason || null,
      },
    });

    const recipientId =
      input.userId === contract.organizadorId
        ? contract.musicoId
        : contract.organizadorId;
    const recipientLink =
      input.userId === contract.organizadorId
        ? "/dashboard/musician"
        : "/dashboard/organizer";

    if (recipientId !== input.userId) {
      await createNotification(tx, {
        usuarioId: recipientId,
        tipo: "CONTRATACION_CANCELADA",
        titulo: "Contratación cancelada",
        mensaje: `La contratación para el evento "${contract.evento.titulo}" fue cancelada.`,
        enlace: recipientLink,
      });
    }

    return updated;
  });
}

export async function completeParticipatingContract(
  contractId: string,
  userId: string
) {
  const contract = await prisma.contratacion.findFirst({
    where: participatingContractWhere(contractId, userId),
    include: { evento: true },
  });
  if (!contract) throw new NotFoundError("Contratación");

  const validation = validarFinalizacionContratacion({
    contratacion: contract,
    evento: contract.evento,
    usuarioId: userId,
    ahora: new Date(),
  });

  if (!validation.ok) {
    switch (validation.motivo) {
      case "ESTADO_INVALIDO_PARA_COMPLETAR":
        throw new ConflictError(
          "Solo se puede completar una contratación acordada"
        );
      case "EVENTO_NO_FINALIZO":
        throw new ConflictError("El evento todavía no finalizó");
      case "USUARIO_NO_PARTICIPANTE":
        throw new NotFoundError("Contratación");
    }
  }

  return prisma.contratacion.update({
    where: { id: contract.id },
    data: { estado: "COMPLETADO" },
    include: { evento: true, proyectoMusical: true },
  });
}
