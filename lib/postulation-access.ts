import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ownedProjectWhere } from "@/lib/authorization";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { validarCreacionPostulacion } from "@/lib/postulaciones";

export const postulationListInclude = {
  evento: {
    select: {
      id: true,
      titulo: true,
      startsAt: true,
      endsAt: true,
      ubicacion: true,
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
  musico: {
    select: {
      id: true,
      nombre: true,
      apellido: true,
    },
  },
  contratacion: {
    select: { id: true, estado: true },
  },
} satisfies Prisma.PostulacionInclude;

export function musicianPostulationWhere(
  postulationId: string,
  musicianId: string
): Prisma.PostulacionWhereInput {
  return { id: postulationId, musicoId: musicianId };
}

export function organizerPostulationWhere(
  postulationId: string,
  organizerId: string
): Prisma.PostulacionWhereInput {
  return {
    id: postulationId,
    evento: { organizadorId: organizerId },
  };
}

export function participatingPostulationWhere(
  postulationId: string,
  userId: string
): Prisma.PostulacionWhereInput {
  return {
    id: postulationId,
    OR: [
      { musicoId: userId },
      { evento: { organizadorId: userId } },
    ],
  };
}

function formatPostulationMessage(
  initialMessage?: string,
  initialOfferAmount?: number
) {
  const parts: string[] = [];

  if (initialMessage?.trim()) parts.push(initialMessage.trim());
  if (initialOfferAmount && initialOfferAmount > 0) {
    parts.push(
      `Oferta inicial solicitada: $${initialOfferAmount.toLocaleString("es-AR")}`
    );
  }

  return parts.length > 0 ? parts.join("\n") : null;
}

export async function createPostulationForMusician(input: {
  eventId: string;
  projectId: string;
  musicianId: string;
  initialMessage?: string;
  initialOfferAmount?: number;
}) {
  const project = await prisma.proyectoMusical.findFirst({
    where: ownedProjectWhere(input.projectId, input.musicianId),
  });
  if (!project) throw new NotFoundError("Proyecto musical");

  const event = await prisma.evento.findUnique({
    where: { id: input.eventId },
  });
  if (!event) throw new NotFoundError("Evento");

  const existing = await prisma.postulacion.findUnique({
    where: {
      eventoId_proyectoMusicalId: {
        eventoId: input.eventId,
        proyectoMusicalId: input.projectId,
      },
    },
  });

  const validation = validarCreacionPostulacion({
    rolUsuario: "MUSICO",
    proyecto: project,
    evento: event,
    usuarioId: input.musicianId,
    postulacionExistente: Boolean(existing),
    ahora: new Date(),
  });

  if (!validation.ok) {
    switch (validation.motivo) {
      case "PROYECTO_INACTIVO":
        throw new ConflictError("El proyecto musical no está activo");
      case "EVENTO_NO_PUBLICADO":
        throw new ConflictError("El evento no está disponible para recibir postulaciones");
      case "EVENTO_YA_COMENZO":
        throw new ConflictError("El evento ya no acepta postulaciones");
      case "POSTULACION_DUPLICADA":
        throw new ConflictError(
          "Ya existe una postulación para este proyecto en este evento"
        );
      case "ROL_NO_PERMITIDO":
      case "PROYECTO_NO_PERTENECE_AL_USUARIO":
        // Rol y ownership se verifican antes y mediante la consulta del proyecto.
        throw new NotFoundError("Proyecto musical");
    }
  }

  return prisma.postulacion.create({
    data: {
      eventoId: input.eventId,
      proyectoMusicalId: input.projectId,
      musicoId: input.musicianId,
      estado: "PENDIENTE",
      mensaje: formatPostulationMessage(
        input.initialMessage,
        input.initialOfferAmount
      ),
    },
    include: {
      evento: {
        select: { id: true, titulo: true, startsAt: true, endsAt: true },
      },
      proyectoMusical: {
        select: { id: true, nombre: true, genero: true },
      },
    },
  });
}

export async function acceptOwnedPostulation(
  postulationId: string,
  organizerId: string
) {
  const postulation = await prisma.postulacion.findFirst({
    where: organizerPostulationWhere(postulationId, organizerId),
    include: { evento: true, proyectoMusical: true },
  });
  if (!postulation) throw new NotFoundError("Postulación");
  if (postulation.estado !== "PENDIENTE") {
    throw new ConflictError("La postulación ya no está pendiente");
  }
  if (postulation.evento.estado !== "PUBLICADO") {
    throw new ConflictError("El evento ya no admite postulaciones");
  }

  return prisma.$transaction(
    async (tx) => {
      const existingContract = await tx.contratacion.findUnique({
        where: {
          eventoId_proyectoMusicalId: {
            eventoId: postulation.eventoId,
            proyectoMusicalId: postulation.proyectoMusicalId,
          },
        },
        select: { id: true },
      });
      if (existingContract) {
        throw new ConflictError(
          "Ya existe una contratación para este proyecto en este evento"
        );
      }

      const claimed = await tx.postulacion.updateMany({
        where: {
          ...organizerPostulationWhere(postulationId, organizerId),
          estado: "PENDIENTE",
        },
        data: { estado: "ACEPTADA" },
      });
      if (claimed.count !== 1) {
        throw new ConflictError(
          "La postulación ya fue procesada por otra operación"
        );
      }

      const unavailableContract = await tx.contratacion.findFirst({
        where: {
          musicoId: postulation.musicoId,
          estado: { in: ["NEGOCIANDO", "ACORDADO"] },
          evento: {
            startsAt: { lt: postulation.evento.endsAt },
            endsAt: { gt: postulation.evento.startsAt },
          },
        },
        select: { id: true },
      });
      if (unavailableContract) {
        throw new ConflictError(
          "El músico ya tiene una contratación activa en ese horario"
        );
      }

      await tx.postulacion.updateMany({
        where: {
          id: { not: postulationId },
          eventoId: postulation.eventoId,
          musicoId: postulation.musicoId,
          estado: "PENDIENTE",
        },
        data: { estado: "CANCELADA" },
      });

      const contract = await tx.contratacion.create({
        data: {
          eventoId: postulation.eventoId,
          proyectoMusicalId: postulation.proyectoMusicalId,
          postulacionId: postulation.id,
          organizadorId: organizerId,
          musicoId: postulation.musicoId,
          creadoPorId: organizerId,
          estado: "NEGOCIANDO",
        },
      });

      const updatedPostulation = await tx.postulacion.findUniqueOrThrow({
        where: { id: postulationId },
      });

      return { updatedPostulation, contract };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export async function rejectOwnedPostulation(
  postulationId: string,
  organizerId: string
) {
  const postulation = await prisma.postulacion.findFirst({
    where: organizerPostulationWhere(postulationId, organizerId),
  });
  if (!postulation) throw new NotFoundError("Postulación");
  if (postulation.estado !== "PENDIENTE") {
    throw new ConflictError("La postulación ya no puede rechazarse");
  }

  const result = await prisma.postulacion.updateMany({
    where: {
      ...organizerPostulationWhere(postulationId, organizerId),
      estado: "PENDIENTE",
    },
    data: { estado: "RECHAZADA" },
  });
  if (result.count !== 1) {
    throw new ConflictError("La postulación ya fue procesada por otra operación");
  }

  return prisma.postulacion.findUniqueOrThrow({ where: { id: postulationId } });
}

export async function cancelOwnedPostulation(
  postulationId: string,
  musicianId: string
) {
  const postulation = await prisma.postulacion.findFirst({
    where: musicianPostulationWhere(postulationId, musicianId),
  });
  if (!postulation) throw new NotFoundError("Postulación");
  if (postulation.estado !== "PENDIENTE") {
    throw new ConflictError("La postulación ya no puede cancelarse");
  }

  const result = await prisma.postulacion.updateMany({
    where: {
      ...musicianPostulationWhere(postulationId, musicianId),
      estado: "PENDIENTE",
    },
    data: { estado: "CANCELADA" },
  });
  if (result.count !== 1) {
    throw new ConflictError("La postulación ya fue procesada por otra operación");
  }

  return prisma.postulacion.findUniqueOrThrow({ where: { id: postulationId } });
}
