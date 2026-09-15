/**
 * Helpers comunes para Route Handlers de la API de Arma tu pogo.
 *
 * @see AGENTS.md § 7. ARQUITECTURA & § 10. AUTENTICACIÓN
 */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { Usuario } from "@/lib/types";

export const uuidSchema = z.string().uuid("ID con formato inválido");

/**
 * Obtiene el usuario autenticado para Route Handlers.
 * Admite sesión vía cookies (Supabase Auth) y encabezado Authorization: Bearer <token>.
 */
export async function getAuthenticatedUser(request?: Request): Promise<Usuario | null> {
  try {
    const supabase = await createClient();
    if (!supabase) return null;

    let authUserId: string | null = null;

    // 1. Intentar con Bearer token del header Authorization si existe
    if (request) {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7).trim();
        if (token) {
          const { data, error } = await supabase.auth.getUser(token);
          if (!error && data?.user) {
            authUserId = data.user.id;
          }
        }
      }

      // Soporte para header de desarrollo x-user-id si está presente y no se pudo obtener por token
      if (!authUserId) {
        const devUserId = request.headers.get("x-user-id");
        if (devUserId && z.string().uuid().safeParse(devUserId).success) {
          const userExists = await prisma.usuario.findUnique({ where: { id: devUserId } });
          if (userExists) {
            return userExists as Usuario;
          }
        }
      }
    }

    // 2. Si no se obtuvo por token, intentar mediante cookies de sesión
    if (!authUserId) {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        authUserId = data.user.id;
      }
    }

    if (!authUserId) return null;

    const usuario = await prisma.usuario.findUnique({
      where: { id: authUserId },
    });

    return usuario as Usuario | null;
  } catch (error) {
    console.error("Error al obtener usuario autenticado:", error);
    return null;
  }
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

