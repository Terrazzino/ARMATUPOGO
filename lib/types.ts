/**
 * Tipos de dominio compartidos en toda la aplicación.
 * Corresponden a las entidades definidas en docs/spec.md
 */

/**
 * Roles funcionales definidos en el MVP
 * @see docs/spec.md § 3. Roles
 */
export enum UserRole {
  MUSICIAN = "MUSICIAN",
  ORGANIZER = "ORGANIZER",
  PUBLIC = "PUBLIC", // No autenticado
}

/**
 * Estados posibles de una contratación
 */
export enum ContractStatus {
  PENDING = "PENDING", // Postulación inicial
  NEGOTIATING = "NEGOTIATING", // En negociación de ofertas
  AGREED = "AGREED", // Oferta aceptada
  CANCELLED = "CANCELLED", // Cancelada
  COMPLETED = "COMPLETED", // Evento finalizado
}

/**
 * Estados posibles de una oferta
 */
export enum OfferStatus {
  PROPOSED = "PROPOSED", // Propuesta inicial
  REJECTED = "REJECTED", // Rechazada
  COUNTERED = "COUNTERED", // Con contraoferta
  ACCEPTED = "ACCEPTED", // Aceptada
}

/**
 * Representación de un usuario autenticado
 * @see docs/spec.md § 4. Entidades
 */
export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

/**
 * Sesión del usuario actual
 */
export interface Session {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
}

/**
 * Tipo para respuestas de error estándar
 */
export interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Tipo para respuestas exitosas
 */
export interface SuccessResponse<T> {
  data: T;
  message?: string;
}
