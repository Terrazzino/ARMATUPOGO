/**
 * Esquemas de validación para autenticación y usuario
 * Utilizados tanto en cliente como en servidor
 *
 * @see AGENTS.md § 14. VALIDACIÓN
 */

import { z } from "zod";
import { VALIDATION_LIMITS } from "@/utils/constants";

/**
 * Esquema para registro de usuario
 */
export const registerSchema = z.object({
  email: z
    .string("Email es requerido")
    .email("Email debe ser válido")
    .max(
      VALIDATION_LIMITS.EMAIL_MAX_LENGTH,
      `Email no puede exceder ${VALIDATION_LIMITS.EMAIL_MAX_LENGTH} caracteres`
    ),
  password: z
    .string("Contraseña es requerida")
    .min(
      VALIDATION_LIMITS.PASSWORD_MIN_LENGTH,
      `Contraseña debe tener al menos ${VALIDATION_LIMITS.PASSWORD_MIN_LENGTH} caracteres`
    ),
  confirmPassword: z.string("Confirmar contraseña es requerido"),
  role: z
    .enum(["MUSICIAN", "ORGANIZER"])
    .refine(
      (role) => role === "MUSICIAN" || role === "ORGANIZER",
      "Rol debe ser MUSICIAN u ORGANIZER"
    ),
  firstName: z
    .string("Nombre es requerido")
    .min(VALIDATION_LIMITS.NAME_MIN_LENGTH)
    .max(VALIDATION_LIMITS.NAME_MAX_LENGTH),
  lastName: z
    .string("Apellido es requerido")
    .min(VALIDATION_LIMITS.NAME_MIN_LENGTH)
    .max(VALIDATION_LIMITS.NAME_MAX_LENGTH),
  agreeTerms: z
    .boolean()
    .refine(
      (val) => val === true,
      "Debes aceptar los términos y condiciones"
    ),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Esquema para login
 */
export const loginSchema = z.object({
  email: z
    .string("Email es requerido")
    .email("Email debe ser válido"),
  password: z
    .string("Contraseña es requerida"),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Esquema para actualizar perfil
 */
export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .min(VALIDATION_LIMITS.NAME_MIN_LENGTH)
    .max(VALIDATION_LIMITS.NAME_MAX_LENGTH)
    .optional(),
  lastName: z
    .string()
    .min(VALIDATION_LIMITS.NAME_MIN_LENGTH)
    .max(VALIDATION_LIMITS.NAME_MAX_LENGTH)
    .optional(),
  bio: z
    .string()
    .max(VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH)
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// Validar que las contraseñas coincidan
export const registerSchemaWithConfirm = registerSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  }
);

export type RegisterInputWithConfirm = z.infer<typeof registerSchemaWithConfirm>;
