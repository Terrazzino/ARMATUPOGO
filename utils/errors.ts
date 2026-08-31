/**
 * Clases de error personalizadas para manejo centralizado de errores.
 *
 * @see AGENTS.md § 15. MANEJO DE ESTADOS
 */

/**
 * Error base de la aplicación
 */
export class BackstageError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "BackstageError";
  }
}

/**
 * Error de validación de entrada
 */
export class ValidationError extends BackstageError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("VALIDATION_ERROR", message, 400, details);
    this.name = "ValidationError";
  }
}

/**
 * Error de autenticación
 */
export class AuthenticationError extends BackstageError {
  constructor(message: string = "Autenticación requerida") {
    super("AUTHENTICATION_ERROR", message, 401);
    this.name = "AuthenticationError";
  }
}

/**
 * Error de autorización
 */
export class AuthorizationError extends BackstageError {
  constructor(message: string = "No tienes permisos para esta acción") {
    super("AUTHORIZATION_ERROR", message, 403);
    this.name = "AuthorizationError";
  }
}

/**
 * Error cuando un recurso no es encontrado
 */
export class NotFoundError extends BackstageError {
  constructor(resource: string) {
    super("NOT_FOUND", `${resource} no encontrado`, 404);
    this.name = "NotFoundError";
  }
}

/**
 * Error de conflicto (ej: recurso duplicado)
 */
export class ConflictError extends BackstageError {
  constructor(message: string) {
    super("CONFLICT", message, 409);
    this.name = "ConflictError";
  }
}

/**
 * Error interno del servidor
 */
export class InternalServerError extends BackstageError {
  constructor(message: string = "Error interno del servidor") {
    super("INTERNAL_SERVER_ERROR", message, 500);
    this.name = "InternalServerError";
  }
}

/**
 * Determina si un error es una instancia de BackstageError
 */
export function isBackstageError(error: unknown): error is BackstageError {
  return error instanceof BackstageError;
}

/**
 * Convierte cualquier error a un BackstageError normalizado
 */
export function normalizeError(error: unknown): BackstageError {
  if (isBackstageError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new InternalServerError(error.message);
  }

  return new InternalServerError("Error desconocido");
}
