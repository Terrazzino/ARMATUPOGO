/**
 * Constantes de la aplicación Arma tu pogo
 */

/**
 * Nombre de la aplicación
 */
export const APP_NAME = "Arma tu pogo";

/**
 * Nombre de la aplicación en minúsculas para URLs
 */
export const APP_SLUG = "arma-tu-pogo";

/**
 * Descripción de la aplicación
 */
export const APP_DESCRIPTION =
  "Conecta proyectos musicales, organizadores y público en un marketplace de recitales y fechas independientes";

/**
 * Roles válidos para autenticación
 */
export const VALID_ROLES = ["MUSICO", "ORGANIZADOR"] as const;

/**
 * Estados válidos de eventos
 */
export const EVENT_STATES = [
  "BORRADOR",
  "PUBLICADO",
  "EN_CURSO",
  "COMPLETADO",
  "CANCELADO",
] as const;

/**
 * Estados válidos de contratación
 */
export const CONTRACT_STATES = [
  "PENDIENTE",
  "NEGOCIANDO",
  "ACORDADO",
  "CANCELADO",
  "COMPLETADO",
  "RECHAZADO",
] as const;

/**
 * Estados válidos de ofertas
 */
export const OFFER_STATES = [
  "PROPUESTA",
  "ACEPTADA",
  "RECHAZADA",
  "CONTRAOFERTADA",
] as const;

/**
 * Tipos de entrada para eventos (MVP conceptual)
 */
export const TICKET_TYPES = [
  "GENERAL",
  "VIP",
  "ANTICIPADA",
  "ENTRADA_LIBRE",
] as const;

/**
 * Valores mínimos y máximos para validación
 */
export const VALIDATION_LIMITS = {
  EMAIL_MAX_LENGTH: 255,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  TITLE_MIN_LENGTH: 3,
  TITLE_MAX_LENGTH: 150,
  DESCRIPTION_MAX_LENGTH: 1000,
  PASSWORD_MIN_LENGTH: 8,
  RATING_MIN_SCORE: 1,
  RATING_MAX_SCORE: 5,
  MAX_PRICE: 100000000,
};

/**
 * Rutas públicas (sin autenticación requerida)
 */
export const PUBLIC_ROUTES = ["/", "/events", "/projects", "/artists"];

/**
 * Rutas protegidas (requieren autenticación)
 */
export const PROTECTED_ROUTES = ["/dashboard"];