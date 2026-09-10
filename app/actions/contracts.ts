/**
 * Server Actions para Contrataciones, Ofertas y Negociaciones
 * 
 * @see docs/spec.md H4, H5, H6, H7
 * @see AGENTS.md § 7. ARQUITECTURA & § 10. AUTORIZACIÓN
 */

"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/app/actions/auth";
import { crearOfertaSchema, type CrearOfertaInput } from "@/lib/validations/offers";
import {
  cancelarContratacionSchema,
  postulacionIdSchema,
  type CancelarContratacionInput,
} from "@/lib/validations/contracts";
import { normalizeError, AuthorizationError, NotFoundError, ValidationError, ConflictError } from "@/lib/errors";

function formatPostulationMessage(initialMessage?: string, initialOfferAmount?: number) {
  const parts: string[] = [];

  if (initialMessage && initialMessage.trim()) {
    parts.push(initialMessage.trim());
  }

  if (initialOfferAmount && initialOfferAmount > 0) {
    parts.push(`Oferta inicial solicitada: $${initialOfferAmount.toLocaleString("es-AR")}`);
  }

  return parts.length > 0 ? parts.join("\n") : null;
}

/**
 * Postula un proyecto musical a un evento (Iniciado por Músico)
 */
export async function applyToEvent(
  eventoId: string,
  proyectoMusicalId: string,
  initialOfferAmount?: number,
  initialMessage?: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthorizationError("Debes iniciar sesión para postularte");
    }

    if (user.rol !== "MUSICO") {
      throw new AuthorizationError("Solo los músicos pueden postular proyectos a eventos");
    }

    const project = await prisma.proyectoMusical.findUnique({
      where: { id: proyectoMusicalId },
    });

    if (!project || project.usuarioId !== user.id) {
      throw new AuthorizationError("El proyecto musical no te pertenece");
    }

    if (!project.estaActivo) {
      throw new ValidationError("El proyecto musical no está activo y no puede postularse");
    }

    const event = await prisma.evento.findUnique({
      where: { id: eventoId },
    });

    if (!event) {
      throw new NotFoundError("Evento");
    }

    if (event.estado !== "PUBLICADO") {
      throw new ValidationError("El evento no está disponible para recibir postulaciones");
    }

    const existingPostulation = await prisma.postulacion.findUnique({
      where: {
        eventoId_proyectoMusicalId: {
          eventoId,
          proyectoMusicalId,
        },
      },
    });

    if (existingPostulation) {
      throw new ConflictError("Ya existe una postulación activa para este proyecto en este evento");
    }

    const postulacion = await prisma.postulacion.create({
      data: {
        eventoId,
        proyectoMusicalId,
        musicoId: user.id,
        estado: "PENDIENTE",
        mensaje: formatPostulationMessage(initialMessage, initialOfferAmount),
      },
    });

    revalidatePath("/dashboard/musician");
    revalidatePath("/dashboard/organizer");
    revalidatePath(`/events/${eventoId}`);

    return {
      success: true,
      data: postulacion,
    };
  } catch (error) {
    const normalized = normalizeError(error);
    return {
      error: true,
      message: normalized.message,
      code: normalized.code,
    };
  }
}

/**
 * Invita un proyecto musical a un evento (Iniciado por Organizador)
 */
export async function inviteProject(
  eventoId: string,
  proyectoMusicalId: string,
  initialOfferAmount?: number,
  initialMessage?: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthorizationError("Debes iniciar sesión para invitar artistas");
    }

    if (user.rol !== "ORGANIZADOR") {
      throw new AuthorizationError("Solo los organizadores pueden invitar artistas a sus eventos");
    }

    const event = await prisma.evento.findUnique({
      where: { id: eventoId },
    });

    if (!event || event.organizadorId !== user.id) {
      throw new AuthorizationError("El evento no te pertenece");
    }

    const project = await prisma.proyectoMusical.findUnique({
      where: { id: proyectoMusicalId },
    });

    if (!project) {
      throw new NotFoundError("Proyecto musical");
    }

    if (!project.estaActivo) {
      throw new ValidationError("El proyecto musical no está activo");
    }

    const existingPostulation = await prisma.postulacion.findUnique({
      where: {
        eventoId_proyectoMusicalId: {
          eventoId,
          proyectoMusicalId,
        },
      },
    });

    const existingContract = await prisma.contratacion.findUnique({
      where: {
        eventoId_proyectoMusicalId: {
          eventoId,
          proyectoMusicalId,
        },
      },
    });

    if (existingPostulation || existingContract) {
      throw new ConflictError("Ya existe una postulación o contratación previa para este proyecto en este evento");
    }

    const hasInitialOffer = initialOfferAmount !== undefined && initialOfferAmount > 0;

    const contract = await prisma.contratacion.create({
      data: {
        eventoId,
        proyectoMusicalId,
        organizadorId: user.id,
        musicoId: project.usuarioId,
        creadoPorId: user.id,
        estado: "NEGOCIANDO",
        ofertas: hasInitialOffer
          ? {
              create: {
                remitenteId: user.id,
                monto: initialOfferAmount,
                mensaje: initialMessage || null,
                estado: "PROPUESTA",
              },
            }
          : undefined,
      },
      include: {
        ofertas: true,
      },
    });

    revalidatePath("/dashboard/organizer");

    return {
      success: true,
      data: contract,
    };
  } catch (error) {
    const normalized = normalizeError(error);
    return {
      error: true,
      message: normalized.message,
      code: normalized.code,
    };
  }
}

export async function acceptPostulation(postulacionId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthorizationError("Debes iniciar sesión para aceptar una postulación");
    }

    if (user.rol !== "ORGANIZADOR") {
      throw new AuthorizationError("Solo los organizadores pueden aceptar postulaciones");
    }

    const validatedPostulacionId = postulacionIdSchema.parse(postulacionId);

    const postulacion = await prisma.postulacion.findUnique({
      where: { id: validatedPostulacionId },
      include: {
        evento: true,
        proyectoMusical: true,
      },
    });

    if (!postulacion) {
      throw new NotFoundError("Postulación");
    }

    if (postulacion.evento.organizadorId !== user.id) {
      throw new AuthorizationError("No puedes aceptar postulaciones de otro organizador");
    }

    if (postulacion.estado !== "PENDIENTE") {
      throw new ValidationError("La postulación ya no está pendiente");
    }

    if (postulacion.evento.estado !== "PUBLICADO") {
      throw new ValidationError("El evento ya no admite postulaciones");
    }

    const { updatedPostulacion, contract } = await prisma.$transaction(async (tx) => {
      const existingContract = await tx.contratacion.findUnique({
        where: {
          eventoId_proyectoMusicalId: {
            eventoId: postulacion.eventoId,
            proyectoMusicalId: postulacion.proyectoMusicalId,
          },
        },
        select: { id: true },
      });

      if (existingContract) {
        throw new ConflictError("Ya existe una contratación para este proyecto y evento");
      }

      const claimedPostulation = await tx.postulacion.updateMany({
        where: {
          id: validatedPostulacionId,
          estado: "PENDIENTE",
          evento: { organizadorId: user.id },
        },
        data: { estado: "ACEPTADA" },
      });

      if (claimedPostulation.count !== 1) {
        throw new ConflictError("La postulación ya fue procesada por otra operación");
      }

      const unavailableContract = await tx.contratacion.findFirst({
        where: {
          musicoId: postulacion.proyectoMusical.usuarioId,
          estado: { in: ["NEGOCIANDO", "ACORDADO"] },
          evento: {
            startsAt: { lt: postulacion.evento.endsAt },
            endsAt: { gt: postulacion.evento.startsAt },
          },
        },
        select: { id: true },
      });

      if (unavailableContract) {
        throw new ConflictError("El músico ya tiene una contratación activa en ese horario");
      }

      await tx.postulacion.updateMany({
        where: {
          id: { not: validatedPostulacionId },
          eventoId: postulacion.eventoId,
          musicoId: postulacion.proyectoMusical.usuarioId,
          estado: "PENDIENTE",
        },
        data: { estado: "CANCELADA" },
      });

      const contract = await tx.contratacion.create({
        data: {
          eventoId: postulacion.eventoId,
          proyectoMusicalId: postulacion.proyectoMusicalId,
          postulacionId: postulacion.id,
          organizadorId: postulacion.evento.organizadorId,
          musicoId: postulacion.proyectoMusical.usuarioId,
          creadoPorId: user.id,
          estado: "NEGOCIANDO",
        },
      });

      const updatedPostulacion = await tx.postulacion.findUniqueOrThrow({
        where: { id: validatedPostulacionId },
      });

      return { updatedPostulacion, contract };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    revalidatePath("/dashboard/organizer");
    revalidatePath("/dashboard/musician");

    return {
      success: true,
      data: {
        postulacion: updatedPostulacion,
        contratacion: contract,
      },
    };
  } catch (error) {
    const normalized = normalizeError(error);
    return {
      error: true,
      message: normalized.message,
      code: normalized.code,
    };
  }
}

export async function rejectPostulation(postulacionId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthorizationError("Debes iniciar sesión para rechazar una postulación");
    }

    if (user.rol !== "ORGANIZADOR") {
      throw new AuthorizationError("Solo los organizadores pueden rechazar postulaciones");
    }

    const validatedPostulacionId = postulacionIdSchema.parse(postulacionId);

    const postulacion = await prisma.postulacion.findUnique({
      where: { id: validatedPostulacionId },
      include: { evento: true },
    });

    if (!postulacion) {
      throw new NotFoundError("Postulación");
    }

    if (postulacion.evento.organizadorId !== user.id) {
      throw new AuthorizationError("No puedes rechazar postulaciones de otro organizador");
    }

    if (postulacion.estado !== "PENDIENTE") {
      throw new ValidationError("La postulación ya no puede rechazarse");
    }

    const updateResult = await prisma.postulacion.updateMany({
      where: {
        id: validatedPostulacionId,
        estado: "PENDIENTE",
        evento: { organizadorId: user.id },
      },
      data: { estado: "RECHAZADA" },
    });

    if (updateResult.count !== 1) {
      throw new ConflictError("La postulación ya fue procesada por otra operación");
    }

    const updated = await prisma.postulacion.findUniqueOrThrow({
      where: { id: validatedPostulacionId },
    });

    revalidatePath("/dashboard/organizer");
    revalidatePath("/dashboard/musician");

    return {
      success: true,
      data: updated,
    };
  } catch (error) {
    const normalized = normalizeError(error);
    return {
      error: true,
      message: normalized.message,
      code: normalized.code,
    };
  }
}

export async function cancelPostulation(postulacionId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthorizationError("Debes iniciar sesión para cancelar una postulación");
    }

    const postulacion = await prisma.postulacion.findUnique({
      where: { id: postulacionId },
    });

    if (!postulacion) {
      throw new NotFoundError("Postulación");
    }

    if (postulacion.musicoId !== user.id) {
      throw new AuthorizationError("No puedes cancelar una postulación que no te pertenece");
    }

    if (postulacion.estado !== "PENDIENTE") {
      throw new ValidationError("Solo se pueden cancelar postulaciones pendientes");
    }

    const updated = await prisma.postulacion.update({
      where: { id: postulacionId },
      data: { estado: "CANCELADA" },
    });

    revalidatePath("/dashboard/musician");

    return {
      success: true,
      data: updated,
    };
  } catch (error) {
    const normalized = normalizeError(error);
    return {
      error: true,
      message: normalized.message,
      code: normalized.code,
    };
  }
}

/**
 * Realiza una nueva oferta o contraoferta económica
 */
export async function createOffer(input: CrearOfertaInput) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthorizationError("No autenticado");
    }

    const validated = crearOfertaSchema.parse(input);

    const contract = await prisma.contratacion.findUnique({
      where: { id: validated.contratacionId },
      include: {
        ofertas: {
          where: { estado: "PROPUESTA" },
        },
      },
    });

    if (!contract) {
      throw new NotFoundError("Contratación");
    }

    // Verificar que sea participante
    if (contract.organizadorId !== user.id && contract.musicoId !== user.id) {
      throw new AuthorizationError("No tienes acceso a esta negociación");
    }

    // Verificar estado válido del contrato
    if (["ACORDADO", "CANCELADO", "COMPLETADO"].includes(contract.estado)) {
      throw new ValidationError(`No se pueden enviar ofertas en una contratación con estado ${contract.estado}`);
    }

    const newOffer = await prisma.$transaction(async (tx) => {
      await tx.oferta.updateMany({
        where: {
          contratacionId: contract.id,
          estado: "PROPUESTA",
        },
        data: {
          estado: "CONTRAOFERTADA",
        },
      });

      const createdOffer = await tx.oferta.create({
        data: {
          contratacionId: contract.id,
          remitenteId: user.id,
          monto: validated.monto,
          mensaje: validated.mensaje || null,
          estado: "PROPUESTA",
        },
      });

      await tx.contratacion.update({
        where: { id: contract.id },
        data: {
          estado: "NEGOCIANDO",
        },
      });

      return createdOffer;
    });

    revalidatePath(`/dashboard`);
    revalidatePath(`/contracts/${contract.id}`);

    return {
      success: true,
      data: newOffer,
    };
  } catch (error) {
    const normalized = normalizeError(error);
    return {
      error: true,
      message: normalized.message,
      code: normalized.code,
    };
  }
}

/**
 * Acepta la oferta vigente y formaliza el acuerdo
 */
export async function acceptOffer(ofertaId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthorizationError("No autenticado");
    }

    const offer = await prisma.oferta.findUnique({
      where: { id: ofertaId },
      include: { contratacion: true },
    });

    if (!offer) {
      throw new NotFoundError("Oferta");
    }

    const contract = offer.contratacion;

    // Solo la contraparte puede aceptar (no el que envió la oferta)
    if (offer.remitenteId === user.id) {
      throw new ValidationError("No puedes aceptar tu propia oferta");
    }

    if (contract.organizadorId !== user.id && contract.musicoId !== user.id) {
      throw new AuthorizationError("No formas parte de esta negociación");
    }

    if (offer.estado !== "PROPUESTA") {
      throw new ValidationError("Esta oferta ya no está disponible para ser aceptada");
    }

    if (["ACORDADO", "CANCELADO", "COMPLETADO"].includes(contract.estado)) {
      throw new ValidationError(`La contratación ya se encuentra en estado ${contract.estado}`);
    }

    const { updatedOffer, updatedContract } = await prisma.$transaction(async (tx) => {
      const contractUpdate = await tx.contratacion.updateMany({
        where: {
          id: contract.id,
          estado: "NEGOCIANDO",
        },
        data: {
          estado: "ACORDADO",
          montoPactado: offer.monto,
          fechaAcuerdo: new Date(),
        },
      });

      if (contractUpdate.count !== 1) {
        throw new ConflictError("La contratación ya fue acordada por otra operación");
      }

      const offerUpdate = await tx.oferta.updateMany({
        where: {
          id: offer.id,
          contratacionId: contract.id,
          estado: "PROPUESTA",
        },
        data: { estado: "ACEPTADA" },
      });

      if (offerUpdate.count !== 1) {
        throw new ConflictError("La oferta ya no está disponible para ser aceptada");
      }

      await tx.oferta.updateMany({
        where: {
          contratacionId: contract.id,
          id: { not: offer.id },
          estado: "PROPUESTA",
        },
        data: { estado: "CONTRAOFERTADA" },
      });

      const updatedOffer = await tx.oferta.findUniqueOrThrow({ where: { id: offer.id } });
      const updatedContract = await tx.contratacion.findUniqueOrThrow({ where: { id: contract.id } });

      return { updatedOffer, updatedContract };
    });

    revalidatePath("/dashboard/musician");
    revalidatePath("/dashboard/organizer");
    revalidatePath(`/contracts/${contract.id}`);

    return {
      success: true,
      data: {
        offer: updatedOffer,
        contract: updatedContract,
      },
    };
  } catch (error) {
    const normalized = normalizeError(error);
    return {
      error: true,
      message: normalized.message,
      code: normalized.code,
    };
  }
}

/**
 * Rechaza una oferta
 */
export async function rejectOffer(ofertaId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthorizationError("No autenticado");
    }

    const offer = await prisma.oferta.findUnique({
      where: { id: ofertaId },
      include: { contratacion: true },
    });

    if (!offer) {
      throw new NotFoundError("Oferta");
    }

    if (offer.remitenteId === user.id) {
      throw new ValidationError("No puedes rechazar tu propia oferta");
    }

    const contract = offer.contratacion;
    if (contract.organizadorId !== user.id && contract.musicoId !== user.id) {
      throw new AuthorizationError("No tienes acceso a esta negociación");
    }

    if (offer.estado !== "PROPUESTA") {
      throw new ValidationError("Solo se pueden rechazar ofertas vigentes");
    }

    if (contract.estado !== "NEGOCIANDO") {
      throw new ValidationError("No se pueden rechazar ofertas en una contratación cerrada");
    }

    const updateResult = await prisma.oferta.updateMany({
      where: {
        id: ofertaId,
        contratacionId: contract.id,
        estado: "PROPUESTA",
        contratacion: {
          estado: "NEGOCIANDO",
        },
      },
      data: { estado: "RECHAZADA" },
    });

    if (updateResult.count !== 1) {
      throw new ConflictError("La oferta ya no está disponible para ser rechazada");
    }

    const updated = await prisma.oferta.findUniqueOrThrow({ where: { id: ofertaId } });

    revalidatePath(`/contracts/${contract.id}`);

    return {
      success: true,
      data: updated,
    };
  } catch (error) {
    const normalized = normalizeError(error);
    return {
      error: true,
      message: normalized.message,
      code: normalized.code,
    };
  }
}

/**
 * Cancela una contratación con motivo
 */
export async function cancelContract(input: CancelarContratacionInput) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthorizationError("No autenticado");
    }

    const validated = cancelarContratacionSchema.parse(input);

    const contract = await prisma.contratacion.findUnique({
      where: { id: validated.contratacionId },
    });

    if (!contract) {
      throw new NotFoundError("Contratación");
    }

    if (contract.organizadorId !== user.id && contract.musicoId !== user.id) {
      throw new AuthorizationError("No tienes permiso para cancelar esta contratación");
    }

    if (contract.estado === "CANCELADO" || contract.estado === "COMPLETADO") {
      throw new ValidationError(`La contratación ya está ${contract.estado}`);
    }

    const updated = await prisma.contratacion.update({
      where: { id: contract.id },
      data: {
        estado: "CANCELADO",
        fechaCancelacion: new Date(),
        motivoCancelacion: validated.motivoCancelacion,
      },
    });

    revalidatePath("/dashboard/musician");
    revalidatePath("/dashboard/organizer");

    return {
      success: true,
      data: updated,
    };
  } catch (error) {
    const normalized = normalizeError(error);
    return {
      error: true,
      message: normalized.message,
      code: normalized.code,
    };
  }
}

/**
 * Obtiene las contrataciones del usuario autenticado (músico u organizador)
 */
export async function getMyContracts() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return [];
    }

    const contracts = await prisma.contratacion.findMany({
      where: {
        OR: [
          { musicoId: user.id },
          { organizadorId: user.id },
        ],
      },
      orderBy: { actualizadoEn: "desc" },
      include: {
        evento: {
          select: {
            id: true,
            titulo: true,
            startsAt: true,
            endsAt: true,
            ubicacion: true,
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
          select: {
            nombre: true,
            apellido: true,
          },
        },
        musico: {
          select: {
            nombre: true,
            apellido: true,
          },
        },
        ofertas: {
          orderBy: { creadoEn: "desc" },
          take: 1,
        },
      },
    });

    return contracts.map((contract) => ({
      ...contract,
      montoPactado: contract.montoPactado?.toNumber() ?? null,
      ofertas: contract.ofertas.map((offer) => ({
        ...offer,
        monto: offer.monto.toNumber(),
      })),
    }));
  } catch (error) {
    console.warn("Could not fetch my contracts:", (error as Error).message);
    return [];
  }
}

/**
 * Obtiene el detalle completo de una contratación con su historial de ofertas
 */
export async function getContractById(contratacionId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return null;
    }

    const contract = await prisma.contratacion.findUnique({
      where: { id: contratacionId },
      include: {
        evento: true,
        proyectoMusical: true,
        organizador: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
        musico: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
        ofertas: {
          orderBy: { creadoEn: "asc" },
          include: {
            remitente: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                rol: true,
              },
            },
          },
        },
        valoraciones: true,
      },
    });

    if (!contract) return null;

    // Verificar pertenencia
    if (contract.organizadorId !== user.id && contract.musicoId !== user.id) {
      return null;
    }

    return contract;
  } catch (error) {
    console.warn("Could not fetch contract by ID:", (error as Error).message);
    return null;
  }
}

/**
 * Obtiene las postulaciones recibidas en eventos del organizador autenticado.
 */
export async function getReceivedPostulations() {
  try {
    const user = await getCurrentUser();
    if (!user || user.rol !== "ORGANIZADOR") {
      return [];
    }

    return await prisma.postulacion.findMany({
      where: {
        evento: { organizadorId: user.id },
        estado: { in: ["PENDIENTE", "ACEPTADA", "RECHAZADA", "CANCELADA"] },
      },
      orderBy: { creadoEn: "desc" },
      select: {
        id: true,
        estado: true,
        mensaje: true,
        creadoEn: true,
        evento: {
          select: {
            id: true,
            titulo: true,
          },
        },
        proyectoMusical: {
          select: {
            id: true,
            nombre: true,
          },
        },
        musico: {
          select: {
            nombre: true,
            apellido: true,
          },
        },
        contratacion: {
          select: { id: true },
        },
      },
    });
  } catch (error) {
    console.warn("Could not fetch received postulations:", (error as Error).message);
    return [];
  }
}
