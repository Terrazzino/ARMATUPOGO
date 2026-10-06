/**
 * Server Actions para Contrataciones, Ofertas y Negociaciones
 * 
 * @see docs/spec.md H4, H5, H6, H7
 * @see AGENTS.md § 7. ARQUITECTURA & § 10. AUTORIZACIÓN
 */

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/api-helpers";
import { participatingContractWhere, requireRole } from "@/lib/authorization";
import {
  crearOfertaSchema,
  ofertaIdSchema,
  type CrearOfertaInput,
} from "@/lib/validations/offers";
import {
  cancelarContratacionSchema,
  contratacionIdSchema,
  crearContratacionSchema,
  crearPostulacionSchema,
  postulacionIdSchema,
  type CancelarContratacionInput,
} from "@/lib/validations/contracts";
import { normalizeError, NotFoundError, ValidationError } from "@/lib/errors";
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
import {
  acceptOfferAsCounterparty,
  createOfferForParticipant,
  getOffersForParticipant,
  rejectOfferAsCounterparty,
} from "@/lib/offer-access";

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
    const user = await requireAuthenticatedUser();
    const parsed = crearOfertaSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError("Datos de oferta inválidos");

    const newOffer = await createOfferForParticipant({
      contractId: parsed.data.contratacionId,
      userId: user.id,
      amount: parsed.data.monto,
      message: parsed.data.mensaje,
    });

    revalidatePath("/dashboard");
    revalidatePath(`/contracts/${parsed.data.contratacionId}`);

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
    const user = await requireAuthenticatedUser();
    const parsedId = ofertaIdSchema.safeParse(ofertaId);
    if (!parsedId.success) throw new ValidationError("ID de oferta inválido");

    const { updatedOffer, updatedContract } = await acceptOfferAsCounterparty(
      parsedId.data,
      user.id
    );

    revalidatePath("/dashboard/musician");
    revalidatePath("/dashboard/organizer");
    revalidatePath(`/contracts/${updatedContract.id}`);

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
    const user = await requireAuthenticatedUser();
    const parsedId = ofertaIdSchema.safeParse(ofertaId);
    if (!parsedId.success) throw new ValidationError("ID de oferta inválido");

    const updated = await rejectOfferAsCounterparty(parsedId.data, user.id);

    revalidatePath("/dashboard/musician");
    revalidatePath("/dashboard/organizer");
    revalidatePath(`/contracts/${updated.contratacionId}`);

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

/** Obtiene el historial de ofertas de una contratación participante. */
export async function getContractOffers(contratacionId: string) {
  const user = await requireAuthenticatedUser();
  const parsedId = contratacionIdSchema.safeParse(contratacionId);
  if (!parsedId.success) throw new ValidationError("ID de contratación inválido");
  return getOffersForParticipant(parsedId.data, user.id);
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
