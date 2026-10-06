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

  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (!supabaseUrl || !supabaseAnonKey) {
    // Si no hay credenciales, las rutas públicas continúan, pero las rutas protegidas NUNCA quedan expuestas
    if (isProtectedRoute) {
      console.error(
        "[Middleware] Intento de acceso a ruta protegida sin credenciales de Supabase:",
        pathname
      );
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("error", "config_missing");
      return NextResponse.redirect(url);
    }
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
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const timeoutSignal = AbortSignal.timeout(5000);
        const signal = init?.signal
          ? AbortSignal.any([init.signal, timeoutSignal])
          : timeoutSignal;
        return fetch(input, {
          ...init,
          signal,
        });
      },
    },
  });

  // Obtener sesión del usuario de forma resiliente
  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data?.user) {
      user = data.user;
    }
  } catch (error) {
    console.error("[Middleware] Fallo al consultar Supabase Auth:", {
      pathname,
      errorName: error instanceof Error ? error.name : typeof error,
    });
    if (isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("error", "auth_unavailable");
      return NextResponse.redirect(url);
    }
  }

  // Proteger rutas que requieren autenticación
  if (isProtectedRoute) {
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
