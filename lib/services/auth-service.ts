/**
 * Servicio aislado para la integración con Supabase Auth (Clase 7 MDW - Servicios Externos).
 *
 * Encapsula la comunicación con el proveedor externo de identidad,
 * traduce errores de infraestructura a errores controlados de dominio
 * y aplica logging seguro sin exponer credenciales ni tokens.
 *
 * @see AGENTS.md § 8. ACCESO A DATOS Y SERVICIOS: PRISMA Y SUPABASE
 * @see AGENTS.md § 10. AUTENTICACIÓN Y AUTORIZACIÓN
 */

import { createClient } from "@/lib/supabase/server";
import {
  ValidationError,
  ConflictError,
  InternalServerError,
  ServiceUnavailableError,
  ConfigurationError,
} from "@/lib/errors";
import type { RolUsuario } from "@/lib/types";

/**
 * Parámetros para registrar un nuevo usuario en el proveedor de identidad.
 */
export interface SignUpParams {
  email: string;
  password: string;
  userData: {
    firstName: string;
    lastName: string;
    role: RolUsuario;
  };
  redirectTo: string;
}

/**
 * Resultado exitoso de registro en el proveedor.
 */
export interface SignUpResult {
  userId: string;
  hasSession: boolean;
}

/**
 * Parámetros para iniciar sesión en el proveedor de identidad.
 */
export interface SignInParams {
  email: string;
  password: string;
}

/**
 * Resultado exitoso de inicio de sesión.
 */
export interface SignInResult {
  userId: string;
  hasSession: boolean;
}

/**
 * Determina si un error retornado por Supabase corresponde a credenciales o sesión inválida
 * (400, 401, 403, JWT ausente o vencido) en contraposición a una falla de infraestructura.
 */
export function isInvalidCredentialError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const authError = error as { name?: string; status?: number; code?: string };

  return (
    authError.name === "AuthSessionMissingError" ||
    authError.name === "AuthInvalidJwtError" ||
    authError.code === "bad_jwt" ||
    authError.code === "invalid_jwt" ||
    authError.code === "session_not_found" ||
    authError.status === 400 ||
    authError.status === 401 ||
    authError.status === 403
  );
}

/**
 * Detecta si un error corresponde a un timeout de red o aborto de petición.
 */
function isTimeoutError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof Error) {
    return (
      error.name === "TimeoutError" ||
      error.name === "AbortError" ||
      error.message.toLowerCase().includes("timeout") ||
      error.message.toLowerCase().includes("aborted")
    );
  }
  if (typeof error === "object" && "name" in error) {
    const name = String((error as { name?: unknown }).name);
    return name === "TimeoutError" || name === "AbortError";
  }
  return false;
}

/**
 * Logging seguro para fallos de comunicación con Supabase Auth.
 * NUNCA registra contraseñas, tokens, emails ni cookies.
 */
function logExternalAuthFailure(operation: string, error: unknown): void {
  const isTimeout = isTimeoutError(error);
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? (error as { status: number }).status
      : undefined;
  const errorName = error instanceof Error ? error.name : typeof error;

  console.error(
    `[ExternalService:SupabaseAuth] Fallo en operación "${operation}":`,
    {
      provider: "Supabase Auth",
      operation,
      type: isTimeout ? "TIMEOUT" : "INFRASTRUCTURE_FAILURE",
      status,
      errorName,
    }
  );
}

export const authService = {
  /**
   * Registra un usuario en Supabase Auth, delegando el correo transaccional de confirmación.
   */
  async signUp(params: SignUpParams): Promise<SignUpResult> {
    const supabase = await createClient();
    if (!supabase) {
      throw new ConfigurationError(
        "El servicio de autenticación no está configurado. Verifica las variables de entorno."
      );
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: params.email,
        password: params.password,
        options: {
          emailRedirectTo: params.redirectTo,
          data: {
            first_name: params.userData.firstName,
            last_name: params.userData.lastName,
            role: params.userData.role,
          },
        },
      });

      if (error) {
        // Fallos de timeout / red / servidor del proveedor
        if (isTimeoutError(error) || (error.status && error.status >= 500)) {
          logExternalAuthFailure("signUp", error);
          throw new ServiceUnavailableError(
            "El servicio de autenticación no está disponible temporalmente. Intenta nuevamente."
          );
        }

        const msg = error.message.toLowerCase();

        // Email ya registrado en Supabase Auth
        if (
          msg.includes("already registered") ||
          msg.includes("user already exists") ||
          error.code === "user_already_exists"
        ) {
          throw new ValidationError("El email ya se encuentra registrado", {
            field: "email",
          });
        }

        // Límite de envíos de correo superado
        if (msg.includes("rate limit") || error.code === "over_email_send_rate_limit") {
          throw new ValidationError(
            "Se ha superado el límite de correos de confirmación de Supabase (máx. 3-4 por hora con el servidor por defecto). Desactiva 'Confirm email' en tu panel de Supabase para desarrollo local o aguarda unos minutos."
          );
        }

        // Cualquier otro error de validación retornado por el proveedor
        throw new ValidationError(error.message);
      }

      if (!data.user) {
        logExternalAuthFailure("signUp", new Error("Usuario nulo tras signUp exitoso"));
        throw new ServiceUnavailableError(
          "No se pudo crear la identidad en el servicio de autenticación."
        );
      }

      return {
        userId: data.user.id,
        hasSession: Boolean(data.session),
      };
    } catch (err) {
      if (
        err instanceof ValidationError ||
        err instanceof ConflictError ||
        err instanceof ServiceUnavailableError ||
        err instanceof ConfigurationError
      ) {
        throw err;
      }

      logExternalAuthFailure("signUp", err);

      if (isTimeoutError(err)) {
        throw new ServiceUnavailableError(
          "Tiempo de espera agotado al comunicarse con el servicio de autenticación."
        );
      }

      throw new ServiceUnavailableError(
        "Error de comunicación con el servicio de autenticación."
      );
    }
  },

  /**
   * Inicia sesión con email y contraseña mediante Supabase Auth.
   */
  async signIn(params: SignInParams): Promise<SignInResult> {
    const supabase = await createClient();
    if (!supabase) {
      throw new ConfigurationError(
        "El servicio de autenticación no está configurado. Verifica las variables de entorno."
      );
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: params.email,
        password: params.password,
      });

      if (error) {
        if (isTimeoutError(error) || (error.status && error.status >= 500)) {
          logExternalAuthFailure("signIn", error);
          throw new ServiceUnavailableError(
            "El servicio de autenticación no está disponible temporalmente. Intenta nuevamente."
          );
        }

        if (error.code === "email_not_confirmed") {
          throw new ValidationError(
            "Tu email todavía no está confirmado. Revisa tu correo y confirma tu cuenta antes de iniciar sesión."
          );
        }

        throw new ValidationError("Email o contraseña incorrectos");
      }

      if (!data.session || !data.user) {
        throw new ValidationError(
          "No se pudo iniciar sesión. Por favor verifica tus credenciales."
        );
      }

      return {
        userId: data.user.id,
        hasSession: true,
      };
    } catch (err) {
      if (
        err instanceof ValidationError ||
        err instanceof ServiceUnavailableError ||
        err instanceof ConfigurationError
      ) {
        throw err;
      }

      logExternalAuthFailure("signIn", err);

      if (isTimeoutError(err)) {
        throw new ServiceUnavailableError(
          "Tiempo de espera agotado al comunicarse con el servicio de autenticación."
        );
      }

      throw new ServiceUnavailableError(
        "Error de comunicación con el servicio de autenticación."
      );
    }
  },

  /**
   * Cierra la sesión activa en Supabase Auth.
   */
  async signOut(): Promise<void> {
    const supabase = await createClient();
    if (!supabase) return;

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        logExternalAuthFailure("signOut", error);
        throw new ServiceUnavailableError(
          "No se pudo cerrar la sesión en el proveedor de autenticación."
        );
      }
    } catch (err) {
      if (err instanceof ServiceUnavailableError) throw err;
      logExternalAuthFailure("signOut", err);
      throw new ServiceUnavailableError(
        "Error de comunicación al cerrar la sesión en el servicio de autenticación."
      );
    }
  },

  /**
   * Valida la identidad del usuario a través de cookies de sesión o token Bearer.
   * Retorna el id de usuario si es válido, o null si la sesión/token es inexistente o inválido.
   * Lanza InternalServerError ante errores de infraestructura o configuración del proveedor.
   */
  async validateSession(accessToken?: string): Promise<string | null> {
    const supabase = await createClient();
    if (!supabase) {
      throw new InternalServerError();
    }

    try {
      const { data, error } = accessToken
        ? await supabase.auth.getUser(accessToken)
        : await supabase.auth.getUser();

      if (error) {
        if (isInvalidCredentialError(error)) {
          return null;
        }

        logExternalAuthFailure("validateSession", error);
        throw new InternalServerError();
      }

      return data.user?.id ?? null;
    } catch (err) {
      if (err instanceof InternalServerError) throw err;

      logExternalAuthFailure("validateSession", err);
      throw new InternalServerError();
    }
  },
};

