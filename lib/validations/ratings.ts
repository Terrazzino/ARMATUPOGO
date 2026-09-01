/**
 * Esquemas de validación Zod para Valoraciones y Reputación.
 *
 * @see docs/spec.md H8, H9
 */

import { z } from "zod";
import { VALIDATION_LIMITS } from "@/lib/constants";

export const crearValoracionSchema = z.object({
  contratacionId: z.string().uuid("ID de contratación inválido"),
  puntaje: z
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
  comentario: z
    .string()
    .trim()
    .max(
      VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH,
      `El comentario no puede superar los ${VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH} caracteres`
    )
    .optional()
    .or(z.literal("")),
});

export type CrearValoracionInput = z.infer<typeof crearValoracionSchema>;