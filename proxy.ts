/**
 * Proxy de Next.js para validación de sesión y autenticación.
 *
 * Se ejecuta antes de las rutas de página incluidas por el matcher. Las API
 * quedan fuera porque autorizan cada operación de forma independiente.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 * @see AGENTS.md § 10. AUTENTICACIÓN Y AUTORIZACIÓN
 */

import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PROTECTED_ROUTES = ["/dashboard"];
const PUBLIC_AUTH_ROUTES = ["/auth/login", "/auth/register", "/auth/callback"];
const AUTH_CACHE_HEADERS = ["cache-control", "expires", "pragma"];

function redirectWithAuthState(url: URL, authResponse: NextResponse) {
  const redirectResponse = NextResponse.redirect(url);

  authResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  AUTH_CACHE_HEADERS.forEach((headerName) => {
    const value = authResponse.headers.get(headerName);
    if (value) {
      redirectResponse.headers.set(headerName, value);
    }
  });

  return redirectResponse;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
    // Las rutas protegidas nunca quedan expuestas si falta la configuración.
    if (isProtectedRoute) {
      console.error(
        "[Proxy] Intento de acceso a ruta protegida sin credenciales de Supabase:",
        pathname
      );
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("error", "config_missing");
      return redirectWithAuthState(url, response);
    }
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headersToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headersToSet).forEach(([name, value]) => {
          response.headers.set(name, value);
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

  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data?.user) {
      user = data.user;
    }
  } catch (error) {
    console.error("[Proxy] Fallo al consultar Supabase Auth:", {
      pathname,
      errorName: error instanceof Error ? error.name : typeof error,
    });
    if (isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("error", "auth_unavailable");
      return redirectWithAuthState(url, response);
    }
  }

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return redirectWithAuthState(url, response);
  }

  if (
    user &&
    PUBLIC_AUTH_ROUTES.some((route) => pathname.startsWith(route))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return redirectWithAuthState(url, response);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Excluye API (que autoriza por operación), recursos internos de Next y
     * los assets públicos de branding. No se excluyen extensiones globalmente:
     * una ruta protegida que termine en ".png" debe seguir protegida.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|branding/).*)",
  ],
};
