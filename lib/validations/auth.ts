/**
 * Esquemas de validación Zod para Autenticación y Perfil de Usuario.
 *
 * @see docs/spec.md H1
 * @see AGENTS.md § 14. VALIDACIÓN CON ZOD
 */

import { z } from "zod";
import { VALIDATION_LIMITS, VALID_ROLES } from "@/lib/constants";

export const registroSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "El email es obligatorio")
    .email("Formato de email inválido")
    .max(VALIDATION_LIMITS.EMAIL_MAX_LENGTH, "El email supera el límite de caracteres")
    .toLowerCase(),
  password: z
    .string()
    .min(
      VALIDATION_LIMITS.PASSWORD_MIN_LENGTH,
      `La contraseña debe tener al menos ${VALIDATION_LIMITS.PASSWORD_MIN_LENGTH} caracteres`
    ),
  nombre: z
    .string()
    .trim()
    .min(
      VALIDATION_LIMITS.NAME_MIN_LENGTH,
      `El nombre debe tener al menos ${VALIDATION_LIMITS.NAME_MIN_LENGTH} caracteres`
    )
    .max(VALIDATION_LIMITS.NAME_MAX_LENGTH, "El nombre supera el límite de caracteres"),
  apellido: z
    .string()
    .trim()
    .min(
      VALIDATION_LIMITS.NAME_MIN_LENGTH,
      `El apellido debe tener al menos ${VALIDATION_LIMITS.NAME_MIN_LENGTH} caracteres`
    )
    .max(VALIDATION_LIMITS.NAME_MAX_LENGTH, "El apellido supera el límite de caracteres"),
  rol: z.enum(VALID_ROLES, {
    message: "Debes seleccionar un rol válido (Músico u Organizador)",
  }),
});

export const registroSchemaConConfirm = registroSchema
  .extend({
    confirmPassword: z.string().min(1, "Debes confirmar tu contraseña"),
    agreeTerms: z.boolean().refine((val) => val === true, {
      message: "Debes aceptar los términos y condiciones de Arma tu pogo",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "El email es obligatorio")
    .email("Formato de email inválido")
    .toLowerCase(),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export const actualizarPerfilSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(VALIDATION_LIMITS.NAME_MIN_LENGTH)
    .max(VALIDATION_LIMITS.NAME_MAX_LENGTH)
    .optional(),
  apellido: z
    .string()
    .trim()
    .min(VALIDATION_LIMITS.NAME_MIN_LENGTH)
    .max(VALIDATION_LIMITS.NAME_MAX_LENGTH)
    .optional(),
  biografia: z
    .string()
    .trim()
    .max(VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH)
    .optional()
    .or(z.literal("")),
  telefono: z.string().trim().max(30).optional().or(z.literal("")),
});

export type RegistroInput = z.infer<typeof registroSchema>;
export type RegistroInputConConfirm = z.infer<typeof registroSchemaConConfirm>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ActualizarPerfilInput = z.infer<typeof actualizarPerfilSchema>;