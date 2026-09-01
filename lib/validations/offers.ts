/**
 * Esquemas de validación Zod para Ofertas y Contraofertas.
 *
 * @see docs/spec.md H6
 */

import { z } from "zod";
import { VALIDATION_LIMITS } from "@/utils/constants";

/**
 * Esquema para enviar una oferta o contraoferta
 */
export const createOfferSchema = z.object({
  contractId: z.string().uuid("ID de contratación inválido"),
  amount: z
    .number()
    .min(0, "El monto de la oferta no puede ser negativo")
    .max(VALIDATION_LIMITS.MAX_PRICE, "El monto supera el límite permitido"),
  message: z
    .string()
    .trim()
    .max(
      VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH,
      `El mensaje no puede superar los ${VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH} caracteres`
    )
    .optional()
    .or(z.literal("")),
});

/**
 * Esquema para responder a una oferta (aceptar o rechazar)
 */
export const respondOfferSchema = z.object({
  offerId: z.string().uuid("ID de oferta inválido"),
  action: z.enum(["ACCEPT", "REJECT"]),
});

export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type RespondOfferInput = z.infer<typeof respondOfferSchema>;

