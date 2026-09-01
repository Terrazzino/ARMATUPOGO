/**
 * Esquemas de validación Zod para Contrataciones.
 *
 * @see docs/spec.md H4, H5, H7
 */

import { z } from "zod";

export const crearContratacionSchema = z.object({
  eventoId: z.string().uuid("ID de evento inválido"),
  proyectoMusicalId: z.string().uuid("ID de proyecto musical inválido"),
});

export const cancelarContratacionSchema = z.object({
  contratacionId: z.string().uuid("ID de contratación inválido"),
  motivoCancelacion: z
    .string()
    .trim()
    .min(5, "El motivo debe tener al menos 5 caracteres")
    .max(500, "El motivo no puede superar los 500 caracteres"),
});

export type CrearContratacionInput = z.infer<typeof crearContratacionSchema>;
export type CancelarContratacionInput = z.infer<typeof cancelarContratacionSchema>;