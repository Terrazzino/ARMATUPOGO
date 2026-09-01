/**
 * Constantes de la aplicación Backstage
 */

/**
 * Nombre de la aplicación
 */
export const APP_NAME = "Backstage";

/**
 * Nombre de la aplicación en minúsculas para URLs
 */
export const APP_SLUG = "backstage";

/**
 * Descripción de la aplicación
 */
export const APP_DESCRIPTION =
  "Conecta proyectos musicales, organizadores y público en un marketplace de eventos musicales";

/**
 * Roles válidos para autenticación
 */
export const VALID_ROLES = ["MUSICIAN", "ORGANIZER"] as const;

/**
 * Estados válidos de eventos
 */
export const EVENT_STATES = [
  "DRAFT",
  "PUBLISHED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

/**
 * Estados válidos de contratación
 */
export const CONTRACT_STATES = [
  "PENDING",
  "NEGOTIATING",
  "AGREED",
  "CANCELLED",
  "COMPLETED",
  "REJECTED",
] as const;

/**
 * Estados válidos de ofertas
 */
export const OFFER_STATES = [
  "PROPOSED",
  "ACCEPTED",
  "REJECTED",
  "COUNTERED",
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
export const PUBLIC_ROUTES = ["/", "/events", "/artists"];

/**
 * Rutas protegidas (requieren autenticación)
 */
export const PROTECTED_ROUTES = ["/dashboard", "/projects", "/profile"];
