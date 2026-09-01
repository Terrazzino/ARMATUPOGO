/**
 * Esquemas de validación Zod para Eventos.
 * Valida los datos de entrada en formularios y Server Actions.
 *
 * @see docs/spec.md H3
 */

import { z } from "zod";
import { VALIDATION_LIMITS, EVENT_STATES } from "@/utils/constants";

/**
 * Esquema para crear o actualizar un evento
 */
export const eventSchema = z.object({
  title: z
    .string()
    .trim()
    .min(
      VALIDATION_LIMITS.TITLE_MIN_LENGTH,
      `El título debe tener al menos ${VALIDATION_LIMITS.TITLE_MIN_LENGTH} caracteres`
    )
    .max(
      VALIDATION_LIMITS.TITLE_MAX_LENGTH,
      `El título no puede superar los ${VALIDATION_LIMITS.TITLE_MAX_LENGTH} caracteres`
    ),
  description: z
    .string()
    .trim()
    .max(
      VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH,
      `La descripción no puede superar los ${VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH} caracteres`
    )
    .optional()
    .or(z.literal("")),
  eventDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Fecha y hora del evento inválida",
    }),
  location: z
    .string()
    .trim()
    .min(3, "La ubicación o dirección es obligatoria")
    .max(150, "La ubicación no puede superar los 150 caracteres"),
  venueName: z.string().trim().max(100).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  requiredMusiciansCount: z
    .number()
    .int("Debe ser un número entero")
    .min(1, "Se requiere al menos 1 proyecto musical")
    .max(50, "El límite máximo es 50 proyectos musicales"),
  offeredCache: z
    .number()
    .min(0, "El caché ofrecido no puede ser negativo")
    .max(VALIDATION_LIMITS.MAX_PRICE, "El monto supera el límite permitido")
    .optional()
    .nullable(),
  status: z.enum(EVENT_STATES).optional().default("PUBLISHED"),
  bannerUrl: z.string().url("URL de banner inválida").optional().or(z.literal("")),
});

export type EventInput = z.infer<typeof eventSchema>;

