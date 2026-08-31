/**
 * Dashboard principal (protegido)
 * Redirige según el rol del usuario
 * Server Component
 */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/actions/auth";

export const metadata = {
  title: "Dashboard - Backstage",
  description: "Tu dashboard en Backstage",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();

  // Proteger ruta: redirigir si no está autenticado
  if (!user) {
    redirect("/auth/login");
  }

  // Redirigir según rol
  if (user.role === "MUSICIAN") {
    redirect("/dashboard/musician");
  } else if (user.role === "ORGANIZER") {
    redirect("/dashboard/organizer");
  }

  // Fallback (no debería ocurrir)
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Error</h1>
        <p>Rol de usuario no válido</p>
      </div>
    </div>
  );
}
