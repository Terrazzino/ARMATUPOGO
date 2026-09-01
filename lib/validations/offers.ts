/**
 * Esquemas de validación Zod para Ofertas y Contraofertas.
 *
 * @see docs/spec.md H6
 */

import { z } from "zod";
import { VALIDATION_LIMITS } from "@/lib/constants";

export const crearOfertaSchema = z.object({
  contratacionId: z.string().uuid("ID de contratación inválido"),
  monto: z
    .number()
    .min(0, "El monto de la oferta no puede ser negativo")
    .max(VALIDATION_LIMITS.MAX_PRICE, "El monto supera el límite permitido"),
  mensaje: z
    .string()
    .trim()
    .max(
      VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH,
      `El mensaje no puede superar los ${VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH} caracteres`
    )
    .optional()
    .or(z.literal("")),
});

export type CrearOfertaInput = z.infer<typeof crearOfertaSchema>;