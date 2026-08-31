/**
 * Página de registro
 * Server Component
 */

import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata = {
  title: "Registrarse - Backstage",
  description: "Crea tu cuenta en Backstage",
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Crear cuenta
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Únete a Backstage, el marketplace de música
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
