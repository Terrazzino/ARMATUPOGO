/**
 * Funciones de validación de entrada para toda la aplicación.
 * Validación SIEMPRE debe ocurrir también en el servidor.
 *
 * @see AGENTS.md § 14. VALIDACIÓN
 */

import { VALIDATION_LIMITS } from "./constants";

/**
 * Valida si un email tiene formato válido
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return (
    email.length <= VALIDATION_LIMITS.EMAIL_MAX_LENGTH &&
    emailRegex.test(email)
  );
}

/**
 * Valida si una contraseña cumple requisitos mínimos
 * - Mínimo 8 caracteres
 */
export function isValidPassword(password: string): boolean {
  return password.length >= VALIDATION_LIMITS.PASSWORD_MIN_LENGTH;
}

/**
 * Valida si un nombre tiene longitud válida
 */
export function isValidName(name: string): boolean {
  return (
    name.length >= VALIDATION_LIMITS.NAME_MIN_LENGTH &&
    name.length <= VALIDATION_LIMITS.NAME_MAX_LENGTH
  );
}

/**
 * Valida si una descripción tiene longitud válida
 */
export function isValidDescription(description: string): boolean {
  return description.length <= VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH;
}

/**
 * Valida si un rol es válido
 */
export function isValidRole(role: unknown): role is "MUSICIAN" | "ORGANIZER" {
  return role === "MUSICIAN" || role === "ORGANIZER";
}

/**
 * Limpia y sanitiza una cadena de entrada
 * Nota: para HTML/scripts, utilizar escaping en React
 */
export function sanitizeInput(input: string): string {
  return input.trim();
}
