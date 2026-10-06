/**
 * Esquemas de validación Zod para Contrataciones.
 *
 * @see docs/spec.md H4, H5, H7
 */

import { z } from "zod";

export const contratacionIdSchema = z
  .string()
  .uuid("ID de contratación inválido");

export const crearContratacionSchema = z
  .object({
    eventoId: z.string().uuid("ID de evento inválido"),
    proyectoMusicalId: z.string().uuid("ID de proyecto musical inválido"),
    initialOfferAmount: z
      .number()
      .min(0, "El monto no puede ser negativo")
      .optional(),
    initialMessage: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .strict();

export const postulacionIdSchema = z.string().uuid("ID de postulación inválido");

export const crearPostulacionSchema = z
  .object({
    eventoId: z.string().uuid("ID de evento inválido"),
    proyectoMusicalId: z.string().uuid("ID de proyecto musical inválido"),
    mensaje: z.string().trim().max(1000).optional().or(z.literal("")),
    initialOfferAmount: z.number().min(0).optional(),
  })
  .strict();

export const motivoCancelacionSchema = z
  .string()
  .trim()
  .min(5, "El motivo debe tener al menos 5 caracteres")
  .max(500, "El motivo no puede superar los 500 caracteres");

export const cancelarContratacionBodySchema = z
  .object({
    motivoCancelacion: motivoCancelacionSchema.optional().or(z.literal("")),
  })
  .strict();

export const cancelarContratacionSchema = z
  .object({
    contratacionId: contratacionIdSchema,
    motivoCancelacion: motivoCancelacionSchema,
  })
  .strict();

export type CrearContratacionInput = z.infer<typeof crearContratacionSchema>;
export type CancelarContratacionInput = z.infer<typeof cancelarContratacionSchema>;
