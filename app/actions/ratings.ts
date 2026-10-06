/**
 * Server Actions para Valoraciones y Reputación.
 *
 * @see docs/spec.md H12, H13
 */

"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticatedUser } from "@/lib/api-helpers";
import { normalizeError, ValidationError } from "@/lib/errors";
import {
  createRatingForParticipant,
  getPublicProjectReputation,
  getPublicUserReputation,
  getRatingsForParticipant,
} from "@/lib/rating-access";
import {
  crearValoracionSchema,
  valoracionTargetIdSchema,
  type CrearValoracionInput,
} from "@/lib/validations/ratings";

export async function createRating(input: CrearValoracionInput) {
  try {
    const user = await requireAuthenticatedUser();
    const parsed = crearValoracionSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Datos de valoración inválidos");
    }

    const rating = await createRatingForParticipant({
      contractId: parsed.data.contratacionId,
      userId: user.id,
      score: parsed.data.puntaje,
      comment: parsed.data.comentario,
    });

    revalidatePath("/dashboard/musician");
    revalidatePath("/dashboard/organizer");
    if (rating.proyectoDestinatarioId) {
      revalidatePath(`/projects/${rating.proyectoDestinatarioId}`);
    }

    return { success: true, data: rating };
  } catch (error) {
    const normalized = normalizeError(error);
    return {
      error: true,
      message: normalized.message,
      code: normalized.code,
    };
  }
}

/** Obtiene valoraciones solamente si el usuario participa de la contratación. */
export async function getContractRatings(contratacionId: string) {
  const user = await requireAuthenticatedUser();
  const parsedId = valoracionTargetIdSchema.safeParse(contratacionId);
  if (!parsedId.success) {
    throw new ValidationError("ID de contratación inválido");
  }
  return getRatingsForParticipant(parsedId.data, user.id);
}

/** Obtiene la reputación pública recibida por un usuario. */
export async function getUserReputation(userId: string) {
  try {
    const parsedId = valoracionTargetIdSchema.safeParse(userId);
    if (!parsedId.success) throw new ValidationError("ID de usuario inválido");

    const reputation = await getPublicUserReputation(parsedId.data);
    return {
      total: reputation.total,
      averageScore: reputation.promedio,
      ratings: reputation.valoraciones,
    };
  } catch (error) {
    console.warn("Could not fetch user reputation:", (error as Error).message);
    return { total: 0, averageScore: 0, ratings: [] };
  }
}

/** Obtiene la reputación pública de un proyecto musical activo. */
export async function getProjectReputation(projectId: string) {
  try {
    const parsedId = valoracionTargetIdSchema.safeParse(projectId);
    if (!parsedId.success) throw new ValidationError("ID de proyecto inválido");

    const reputation = await getPublicProjectReputation(parsedId.data);
    return {
      total: reputation.total,
      averageScore: reputation.promedio,
      ratings: reputation.valoraciones,
    };
  } catch (error) {
    console.warn("Could not fetch project reputation:", (error as Error).message);
    return { total: 0, averageScore: 0, ratings: [] };
  }
}
