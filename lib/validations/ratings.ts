/**
 * Esquemas de validación Zod para Valoraciones y Reputación.
 *
 * @see docs/spec.md H8, H9
 */

import { z } from "zod";
import { VALIDATION_LIMITS } from "@/utils/constants";

/**
 * Esquema para crear una valoración
 */
export const ratingSchema = z.object({
  contractId: z.string().uuid("ID de contratación inválido"),
  targetId: z.string().uuid("ID de usuario destinatario inválido"),
  targetProjectId: z.string().uuid("ID de proyecto inválido").optional().nullable(),
  score: z
    .number()
    .int("El puntaje debe ser un número entero")
    .min(
      VALIDATION_LIMITS.RATING_MIN_SCORE,
      `El puntaje mínimo es ${VALIDATION_LIMITS.RATING_MIN_SCORE}`
    )
    .max(
      VALIDATION_LIMITS.RATING_MAX_SCORE,
      `El puntaje máximo es ${VALIDATION_LIMITS.RATING_MAX_SCORE}`
    ),
  comment: z
    .string()
    .trim()
    .max(
      VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH,
      `El comentario no puede superar los ${VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH} caracteres`
    )
    .optional()
    .or(z.literal("")),
});

export type RatingInput = z.infer<typeof ratingSchema>;

