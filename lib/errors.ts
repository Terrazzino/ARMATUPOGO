/**
 * Clases de error personalizadas para manejo centralizado de errores.
 *
 * @see AGENTS.md § 15. MANEJO DE ESTADOS
 */

/**
 * Error base de la aplicación
 */
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Error de validación de entrada
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("VALIDATION_ERROR", message, 400, details);
    this.name = "ValidationError";
  }
}

/**
 * Error de autenticación
 */
export class AuthenticationError extends AppError {
  constructor(message: string = "Autenticación requerida") {
    super("AUTHENTICATION_ERROR", message, 401);
    this.name = "AuthenticationError";
  }
}

/**
 * Error de autorización
 */
export class AuthorizationError extends AppError {
  constructor(message: string = "No tienes permisos para esta acción") {
    super("AUTHORIZATION_ERROR", message, 403);
    this.name = "AuthorizationError";
  }
}

/**
 * Error cuando un recurso no es encontrado
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super("NOT_FOUND", `${resource} no encontrado`, 404);
    this.name = "NotFoundError";
  }
}

/**
 * Error de conflicto (ej: recurso duplicado)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", message, 409);
    this.name = "ConflictError";
  }
}

/**
 * Error interno del servidor
 */
export class InternalServerError extends AppError {
  constructor() {
    super("INTERNAL_SERVER_ERROR", "Error interno del servidor", 500);
    this.name = "InternalServerError";
  }
}

/**
 * La identidad fue validada por Supabase, pero no tiene un perfil local asociado.
 * Es una inconsistencia interna, no una ausencia de autenticación.
 */
export class UserProfileNotFoundError extends AppError {
  constructor() {
    super(
      "USER_PROFILE_NOT_FOUND",
      "No se pudo cargar el perfil del usuario autenticado",
      500
    );
    this.name = "UserProfileNotFoundError";
  }
}

/**
 * Determina si un error es una instancia de AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Convierte cualquier error a un AppError normalizado
 */
export function normalizeError(error: unknown): AppError {
  if (isAppError(error)) {
    return error.statusCode >= 500 ? new InternalServerError() : error;
  }

  // Si es un error de redirección de Next.js (lanzado por redirect()), se relanza para que Next.js realice la navegación
  if (
    error &&
    typeof error === "object" &&
    "digest" in error &&
    typeof (error as { digest: string }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  ) {
    throw error;
  }

  if (error instanceof Error && error.message === "NEXT_REDIRECT") {
    throw error;
  }

  // Los errores inesperados pueden contener datos de infraestructura, consultas o
  // credenciales. El detalle se conserva solamente en los logs del servidor.
  return new InternalServerError();
}
