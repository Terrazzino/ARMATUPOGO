/**
 * Middleware de Next.js para validación de sesión y autenticación.
 *
 * Este middleware se ejecuta en cada request y valida la sesión del usuario.
 *
 * @see https://nextjs.org/docs/app/building-application-features/authentication
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 * @see AGENTS.md § 10. AUTENTICACIÓN Y AUTORIZACIÓN
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Rutas que requieren autenticación
const PROTECTED_ROUTES = ["/dashboard"];

// Rutas públicas (sin autenticación)
const PUBLIC_AUTH_ROUTES = ["/auth/login", "/auth/register", "/auth/callback"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Crear cliente de Supabase
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Si no hay credenciales, permitir acceso (no está configurado aún)
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Obtener sesión del usuario
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Proteger rutas que requieren autenticación
  if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!user) {
      // Redirigir a login si no está autenticado
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }
  }

  // Redirigir usuarios autenticados fuera de rutas de auth
  if (PUBLIC_AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    if (user) {
      // Redirigir al dashboard si ya está autenticado
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
