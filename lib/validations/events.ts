/**
 * Esquemas de validación Zod para Eventos y Recitales.
 *
 * @see docs/spec.md H3
 */

import { z } from "zod";
import { VALIDATION_LIMITS } from "@/lib/constants";

export const eventIdSchema = z.uuid("ID de evento inválido");

export const eventoSchema = z.object({
  titulo: z
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
  descripcion: z
    .string()
    .trim()
    .max(
      VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH,
      `La descripción no puede superar los ${VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH} caracteres`
    )
    .optional()
    .or(z.literal("")),
  startsAt: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Fecha y hora de inicio del evento inválida",
    }),
  endsAt: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Fecha y hora de finalización del evento inválida",
    }),
  ubicacion: z
    .string()
    .trim()
    .min(3, "La ubicación o dirección es obligatoria")
    .max(150, "La ubicación no puede superar los 150 caracteres"),
  nombreLugar: z.string().trim().max(100).optional().or(z.literal("")),
  ciudad: z.string().trim().max(100).optional().or(z.literal("")),
  cantidadMusicosRequerida: z
    .number()
    .int("Debe ser un número entero")
    .min(1, "Se requiere al menos 1 proyecto musical")
    .max(50, "El límite máximo es 50 proyectos musicales"),
  cacheOfrecido: z
    .number()
    .min(0, "El caché ofrecido no puede ser negativo")
    .max(VALIDATION_LIMITS.MAX_PRICE, "El monto supera el límite permitido")
    .optional()
    .nullable(),
  bannerUrl: z.string().url("URL de banner inválida").optional().or(z.literal("")),
}).strict();

/**
 * Precio único de entrada en pesos argentinos enteros. `0` significa entrada gratuita.
 * `error` cubre campo vacío, ausente o no numérico (NaN).
 */
const precioEntradaSchema = z
  .number({ error: "Ingresá el precio de entrada (0 si es gratuita)" })
  .int("El precio de entrada debe ser un número entero de pesos")
  .min(0, "El precio de entrada no puede ser negativo")
  .max(VALIDATION_LIMITS.MAX_PRICE, "El precio de entrada supera el límite permitido");

/** Contrato de creación (Server Action y POST /api/eventos): el precio es obligatorio. */
export const eventoCreateSchema = eventoSchema.extend({
  precioEntrada: precioEntradaSchema,
});

/** Contrato de actualización (Server Action y PATCH /api/eventos/:id): todos los campos son opcionales. */
export const eventoUpdateSchema = eventoCreateSchema.partial();

/**
 * Validación del formulario en modo edición. Los eventos históricos pueden no tener
 * Entrada, por lo que el precio es opcional y sólo se envía si el organizador lo completa.
 */
export const eventoEditFormSchema = eventoSchema.extend({
  precioEntrada: precioEntradaSchema.optional(),
});

export type EventoInput = z.infer<typeof eventoSchema>;
export type EventoCreateInput = z.infer<typeof eventoCreateSchema>;
export type EventoUpdateInput = z.infer<typeof eventoUpdateSchema>;
export type EventoFormValues = z.infer<typeof eventoEditFormSchema>;
