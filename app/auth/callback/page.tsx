/**
 * Página de callback de autenticación (Supabase email confirmation)
 * Server Component
 */

import { redirect } from "next/navigation";

export const metadata = {
  title: "Confirmar email - Backstage",
};

export default async function AuthCallbackPage() {
  // En Supabase, después de que el usuario confirma su email,
  // es redirigido a esta página con un token en la URL.
  // Para esta etapa del MVP, simplemente redirigimos al login.
  // En una versión más avanzada, aquí se procesaría la confirmación.

  redirect("/auth/login");
}
