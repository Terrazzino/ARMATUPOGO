/**
 * Dashboard para organizadores
 * Server Component - protegido
 */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/actions/auth";
import { LogoutButton } from "@/components/auth/LogoutButton";

export const metadata = {
  title: "Dashboard de organizador - Backstage",
  description: "Tu dashboard de organizador en Backstage",
};

export default async function OrganizerDashboardPage() {
  const user = await getCurrentUser();

  // Proteger ruta: redirigir si no está autenticado
  if (!user) {
    redirect("/auth/login");
  }

  // Proteger por rol: solo organizadores
  if (user.role !== "ORGANIZER") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Dashboard de Organizador
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Bienvenido, {user.first_name}
            </p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Mis Eventos
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Crea y administra tus eventos
            </p>
            <button className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              Crear evento
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Postulaciones
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Revisa las postulaciones de músicos
            </p>
            <button className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              Ver postulaciones
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Contrataciones
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Gestiona tus contrataciones
            </p>
            <button className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              Ver contrataciones
            </button>
          </div>
        </div>

        <div className="mt-12 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Información de Perfil
          </h2>
          <div className="space-y-3">
            <p>
              <strong className="text-gray-700 dark:text-gray-200">Email:</strong>
              <span className="ml-2 text-gray-600 dark:text-gray-400">
                {user.email}
              </span>
            </p>
            <p>
              <strong className="text-gray-700 dark:text-gray-200">Nombre:</strong>
              <span className="ml-2 text-gray-600 dark:text-gray-400">
                {user.first_name} {user.last_name}
              </span>
            </p>
            <p>
              <strong className="text-gray-700 dark:text-gray-200">Rol:</strong>
              <span className="ml-2 text-gray-600 dark:text-gray-400">
                Organizador
              </span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
