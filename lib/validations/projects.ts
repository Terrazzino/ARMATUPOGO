/**
 * Esquemas de validación Zod para Proyectos Musicales.
 * Valida los datos de entrada en formularios y Server Actions.
 *
 * @see docs/spec.md H2
 */

import { z } from "zod";
import { VALIDATION_LIMITS } from "@/utils/constants";

/**
 * Esquema para crear o actualizar un proyecto musical
 */
export const projectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(
      VALIDATION_LIMITS.NAME_MIN_LENGTH,
      `El nombre artístico debe tener al menos ${VALIDATION_LIMITS.NAME_MIN_LENGTH} caracteres`
    )
    .max(
      VALIDATION_LIMITS.NAME_MAX_LENGTH,
      `El nombre artístico no puede superar los ${VALIDATION_LIMITS.NAME_MAX_LENGTH} caracteres`
    ),
  genre: z
    .string()
    .trim()
    .min(2, "El género musical es obligatorio")
    .max(50, "El género musical no puede superar los 50 caracteres"),
  description: z
    .string()
    .trim()
    .max(
      VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH,
      `La descripción no puede superar los ${VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH} caracteres`
    )
    .optional()
    .or(z.literal("")),
  approximateCache: z
    .number()
    .min(0, "El caché aproximado no puede ser negativo")
    .max(VALIDATION_LIMITS.MAX_PRICE, "El monto supera el límite permitido")
    .optional()
    .nullable(),
  location: z.string().trim().max(100).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  imageUrl: z.string().url("URL de imagen inválida").optional().or(z.literal("")),
  spotifyUrl: z.string().url("URL de Spotify inválida").optional().or(z.literal("")),
  youtubeUrl: z.string().url("URL de YouTube inválida").optional().or(z.literal("")),
  instagramUrl: z.string().url("URL de Instagram inválida").optional().or(z.literal("")),
  websiteUrl: z.string().url("URL de sitio web inválida").optional().or(z.literal("")),
  customLinks: z
    .array(
      z.object({
        title: z.string().min(1, "El título del enlace es requerido").max(50),
        url: z.string().url("URL inválida"),
      })
    )
    .optional()
    .default([]),
});

export type ProjectInput = z.infer<typeof projectSchema>;

