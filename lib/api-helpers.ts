/**
 * Helpers comunes para Route Handlers de la API de Arma tu pogo.
 *
 * @see AGENTS.md § 7. ARQUITECTURA & § 10. AUTENTICACIÓN
 */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  AuthenticationError,
  InternalServerError,
  UserProfileNotFoundError,
  normalizeError,
} from "@/lib/errors";
import type { Usuario } from "@/lib/types";

export const uuidSchema = z.string().uuid("ID con formato inválido");

/**
 * Los errores 400/401/403 devueltos por getUser representan una credencial que
 * Supabase no pudo validar. Los errores de red, configuración o servicio son 500.
 */
function isInvalidCredentialError(error: unknown): boolean {
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

type SupabaseServerClient = NonNullable<Awaited<ReturnType<typeof createClient>>>;

async function getSupabaseUserId(
  supabase: SupabaseServerClient,
  accessToken?: string
): Promise<string | null> {
  try {
    const { data, error } = accessToken
      ? await supabase.auth.getUser(accessToken)
      : await supabase.auth.getUser();

    if (error) {
      if (isInvalidCredentialError(error)) return null;
      throw new InternalServerError();
    }

    return data.user?.id ?? null;
  } catch (error) {
    if (error instanceof InternalServerError) throw error;
    throw new InternalServerError();
  }
}

/**
 * Obtiene el usuario autenticado mediante una identidad validada por Supabase.
 * Admite cookies Supabase SSR o Authorization: Bearer <access_token>.
 * El encabezado x-user-id no forma parte del flujo y se ignora siempre.
 */
export async function getAuthenticatedUser(request?: Request): Promise<Usuario | null> {
  // No envolver createClient() en catch: cookies() puede lanzar la señal interna
  // con la que Next determina que una ruta debe renderizarse dinámicamente.
  const supabase = await createClient();
  if (!supabase) throw new InternalServerError();

  const authorization = request?.headers.get("authorization");
  let authUserId: string | null;

  if (authorization !== null && authorization !== undefined) {
    const bearer = authorization.match(/^Bearer\s+(.+)$/i);
    const accessToken = bearer?.[1]?.trim();

    // Un Authorization presente pero mal formado no debe habilitar un fallback
    // silencioso a otra identidad por cookies.
    if (!accessToken) return null;
    authUserId = await getSupabaseUserId(supabase, accessToken);
  } else {
    authUserId = await getSupabaseUserId(supabase);
  }

  if (!authUserId) return null;

  let usuario;
  try {
    usuario = await prisma.usuario.findUnique({
      where: { id: authUserId },
    });
  } catch {
    throw new InternalServerError();
  }

  if (!usuario) throw new UserProfileNotFoundError();

  return usuario as Usuario;
}

/** Exige una sesión o access token válido. */
export async function requireAuthenticatedUser(request?: Request): Promise<Usuario> {
  const usuario = await getAuthenticatedUser(request);
  if (!usuario) throw new AuthenticationError();
  return usuario;
}

/**
 * Genera una respuesta uniforme de error de validación Zod (400).
 */
export function zodErrorResponse(error: z.ZodError) {
  return Response.json(
    {
      error: "Datos inválidos",
      detalles: error.flatten().fieldErrors,
    },
    { status: 400 }
  );
}

/**
 * Genera una respuesta uniforme de error con status code explícito.
 */
export function errorResponse(
  message: string,
  status: number,
  extras?: Record<string, unknown>
) {
  return Response.json(
    {
      error: message,
      ...extras,
    },
    { status }
  );
}

/** Convierte errores de dominio en respuestas HTTP sin exponer detalles internos. */
export function apiErrorResponse(error: unknown) {
  const normalized = normalizeError(error);

  return Response.json(
    {
      error: normalized.message,
      code: normalized.code,
      ...(normalized.statusCode < 500 && normalized.details
        ? { detalles: normalized.details }
        : {}),
    },
    { status: normalized.statusCode }
  );
}

