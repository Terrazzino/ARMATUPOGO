/**
 * Esquemas de validación Zod para Contrataciones.
 *
 * @see docs/spec.md H4, H5, H7
 */

import { z } from "zod";

/**
 * Esquema para postularse a un evento o invitar a un proyecto
 */
export const createContractSchema = z.object({
  eventId: z.string().uuid("ID de evento inválido"),
  musicalProjectId: z.string().uuid("ID de proyecto musical inválido"),
  organizerId: z.string().uuid("ID de organizador inválido"),
  musicianId: z.string().uuid("ID de músico inválido"),
});

/**
 * Esquema para cancelar una contratación
 */
export const cancelContractSchema = z.object({
  contractId: z.string().uuid("ID de contratación inválido"),
  cancellationReason: z
    .string()
    .trim()
    .min(5, "El motivo debe tener al menos 5 caracteres")
    .max(500, "El motivo no puede superar los 500 caracteres"),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type CancelContractInput = z.infer<typeof cancelContractSchema>;

