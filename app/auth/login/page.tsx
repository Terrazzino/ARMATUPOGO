/**
 * Página de login
 * Server Component
 */

import { LoginForm } from "@/components/auth/LoginForm";

interface LoginPageProps {
  searchParams: Promise<{ registered?: string }>;
}

export const metadata = {
  title: "Iniciar sesión - Arma tu pogo",
  description: "Inicia sesión en tu cuenta de Arma tu pogo",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const registered = params?.registered === "true";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Iniciar sesión
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Bienvenido a Arma tu pogo
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <LoginForm registered={registered} />
        </div>
      </div>
    </div>
  );
}
