/**
 * Dashboard principal (protegido)
 * Redirige según el rol del usuario
 * Server Component
 */

import { redirect } from "next/navigation";
import { getAuthenticatedUserForRender as getCurrentUser } from "@/lib/auth-render";

export const metadata = {
  title: "Dashboard - Arma tu pogo",
  description: "Tu dashboard en Arma tu pogo",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (user.rol === "MUSICO") {
    redirect("/dashboard/musician");
  } else if (user.rol === "ORGANIZADOR") {
    redirect("/dashboard/organizer");
  }

  return (
    <main className="atp-page grid min-h-dvh place-items-center px-4">
      <div className="atp-panel max-w-md border-l-4 border-l-red-600 p-6 text-center">
        <h1 className="atp-heading text-3xl">Error</h1>
        <p className="mt-2 text-neutral-400">Rol de usuario no válido</p>
      </div>
    </main>
  );
}
