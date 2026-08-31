/**
 * Middleware de Next.js para validación de sesión y autenticación.
 *
 * Este middleware se ejecuta en cada request y valida la sesión del usuario.
 *
 * @see https://nextjs.org/docs/app/building-application-features/authentication
 * @see AGENTS.md § 10. AUTENTICACIÓN Y AUTORIZACIÓN
 */

import { type NextRequest, NextResponse } from "next/server";

// Placeholder: validación real se implementará en Fase 1
// Cuando se implemente Supabase Auth, aquí se validará la sesión
// Los errores de acceso serán manejados en los componentes

export async function middleware(request: NextRequest) {
  // Por ahora, permitir acceso a todas las rutas
  // En Fase 1 se agregará lógica de validación con Supabase Auth
  return NextResponse.next();
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
