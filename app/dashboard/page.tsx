/**
 * Dashboard principal (protegido)
 * Redirige según el rol del usuario
 * Server Component
 */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/actions/auth";

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
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Error</h1>
        <p>Rol de usuario no válido</p>
      </div>
    </div>
  );
}