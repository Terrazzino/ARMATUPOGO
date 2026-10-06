/**
 * Helpers comunes para Route Handlers de la API de Arma tu pogo.
 *
 * @see AGENTS.md § 7. ARQUITECTURA & § 10. AUTENTICACIÓN
 */

import { z } from "zod";
import { authService } from "@/lib/services/auth-service";
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
 * Obtiene el usuario autenticado mediante una identidad validada por Supabase Auth.
 * Admite cookies Supabase SSR o Authorization: Bearer <access_token>.
 * El encabezado x-user-id no forma parte del flujo y se ignora siempre.
 */
export async function getAuthenticatedUser(request?: Request): Promise<Usuario | null> {
  const authorization = request?.headers.get("authorization");
  let authUserId: string | null;

  if (authorization !== null && authorization !== undefined) {
    const bearer = authorization.match(/^Bearer\s+(.+)$/i);
    const accessToken = bearer?.[1]?.trim();

    // Un Authorization presente pero mal formado no debe habilitar un fallback
    // silencioso a otra identidad por cookies.
    if (!accessToken) return null;
    authUserId = await authService.validateSession(accessToken);
  } else {
    authUserId = await authService.validateSession();
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

