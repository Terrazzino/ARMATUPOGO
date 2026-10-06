/**
 * Server Actions para Contrataciones, Ofertas y Negociaciones
 * 
 * @see docs/spec.md H4, H5, H6, H7
 * @see AGENTS.md § 7. ARQUITECTURA & § 10. AUTORIZACIÓN
 */

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/app/actions/auth";
import { requireAuthenticatedUser } from "@/lib/api-helpers";
import { participatingContractWhere, requireRole } from "@/lib/authorization";
import { crearOfertaSchema, type CrearOfertaInput } from "@/lib/validations/offers";
import {
  cancelarContratacionSchema,
  contratacionIdSchema,
  crearContratacionSchema,
  crearPostulacionSchema,
  postulacionIdSchema,
  type CancelarContratacionInput,
} from "@/lib/validations/contracts";
import { normalizeError, AuthorizationError, NotFoundError, ValidationError, ConflictError } from "@/lib/errors";
import {
  acceptOwnedPostulation,
  cancelOwnedPostulation,
  createPostulationForMusician,
  rejectOwnedPostulation,
} from "@/lib/postulation-access";
import {
  cancelParticipatingContract,
  completeParticipatingContract,
  contractDetailInclude,
  contractListInclude,
  contractsForUserWhere,
  createDirectContract,
} from "@/lib/contract-access";

function validatePostulationId(postulationId: string) {
  const parsed = postulacionIdSchema.safeParse(postulationId);
  if (!parsed.success) throw new ValidationError("ID de postulación inválido");
  return parsed.data;
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
    const user = await requireAuthenticatedUser();
    requireRole(user, "MUSICO");

    const parsed = crearPostulacionSchema.safeParse({
      eventoId,
      proyectoMusicalId,
      initialOfferAmount,
      mensaje: initialMessage,
    });
    if (!parsed.success) throw new ValidationError("Datos de postulación inválidos");
    const validated = parsed.data;

    const postulacion = await createPostulationForMusician({
      eventId: validated.eventoId,
      projectId: validated.proyectoMusicalId,
      musicianId: user.id,
      initialMessage: validated.mensaje,
      initialOfferAmount: validated.initialOfferAmount,
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
    const user = await requireAuthenticatedUser();
    requireRole(user, "ORGANIZADOR");

    const parsed = crearContratacionSchema.safeParse({
      eventoId,
      proyectoMusicalId,
      initialOfferAmount,
      initialMessage,
    });
    if (!parsed.success) {
      throw new ValidationError("Datos de contratación inválidos");
    }

    const contract = await createDirectContract({
      eventId: parsed.data.eventoId,
      projectId: parsed.data.proyectoMusicalId,
      organizerId: user.id,
      initialOfferAmount: parsed.data.initialOfferAmount,
      initialMessage: parsed.data.initialMessage,
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
    const user = await requireAuthenticatedUser();
    requireRole(user, "ORGANIZADOR");

    const validatedPostulacionId = validatePostulationId(postulacionId);
    const { updatedPostulation, contract } = await acceptOwnedPostulation(
      validatedPostulacionId,
      user.id
    );

    revalidatePath("/dashboard/organizer");
    revalidatePath("/dashboard/musician");

    return {
      success: true,
      data: {
        postulacion: updatedPostulation,
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
    const user = await requireAuthenticatedUser();
    requireRole(user, "ORGANIZADOR");

    const validatedPostulacionId = validatePostulationId(postulacionId);
    const updated = await rejectOwnedPostulation(validatedPostulacionId, user.id);

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
    const user = await requireAuthenticatedUser();
    requireRole(user, "MUSICO");

    const validatedPostulacionId = validatePostulationId(postulacionId);
    const updated = await cancelOwnedPostulation(validatedPostulacionId, user.id);

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
    const user = await requireAuthenticatedUser();

    const parsed = cancelarContratacionSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Datos de cancelación inválidos");
    }

    const updated = await cancelParticipatingContract({
      contractId: parsed.data.contratacionId,
      userId: user.id,
      cancellationReason: parsed.data.motivoCancelacion,
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
  const user = await requireAuthenticatedUser();

  const contracts = await prisma.contratacion.findMany({
    where: contractsForUserWhere(user.rol, user.id),
    orderBy: { actualizadoEn: "desc" },
    include: contractListInclude,
  });

  return contracts.map((contract) => ({
    ...contract,
    montoPactado: contract.montoPactado?.toNumber() ?? null,
    ofertas: contract.ofertas.map((offer) => ({
      ...offer,
      monto: offer.monto.toNumber(),
    })),
  }));
}

/**
 * Obtiene el detalle completo de una contratación con su historial de ofertas
 */
export async function getContractById(contratacionId: string) {
  const user = await requireAuthenticatedUser();
  const parsedId = contratacionIdSchema.safeParse(contratacionId);
  if (!parsedId.success) throw new ValidationError("ID de contratación inválido");

  const contract = await prisma.contratacion.findFirst({
    where: participatingContractWhere(parsedId.data, user.id),
    include: contractDetailInclude,
  });
  if (!contract) throw new NotFoundError("Contratación");
  return contract;
}

/** Marca una contratación acordada como completada después del evento. */
export async function completeContract(contratacionId: string) {
  try {
    const user = await requireAuthenticatedUser();
    const parsedId = contratacionIdSchema.safeParse(contratacionId);
    if (!parsedId.success) throw new ValidationError("ID de contratación inválido");

    const updated = await completeParticipatingContract(parsedId.data, user.id);

    revalidatePath("/dashboard/musician");
    revalidatePath("/dashboard/organizer");

    return { success: true, data: updated };
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
 * Obtiene las postulaciones recibidas en eventos del organizador autenticado.
 */
export async function getReceivedPostulations() {
  const user = await requireAuthenticatedUser();
  requireRole(user, "ORGANIZADOR");

  return prisma.postulacion.findMany({
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
      evento: { select: { id: true, titulo: true } },
      proyectoMusical: { select: { id: true, nombre: true } },
      musico: { select: { nombre: true, apellido: true } },
      contratacion: { select: { id: true } },
    },
  });
}
