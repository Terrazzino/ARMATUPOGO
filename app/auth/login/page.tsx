/**
 * Página de login
 * Server Component
 */

import { LoginForm } from "@/components/auth/LoginForm";

interface LoginPageProps {
  searchParams: Promise<{ registered?: string; confirmation?: string }>;
}

export const metadata = {
  title: "Iniciar sesión - Arma tu pogo",
  description: "Inicia sesión en tu cuenta de Arma tu pogo",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const registered = params?.registered === "true";
  const emailConfirmationPending = params?.confirmation === "pending";

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Iniciar sesión
          </h1>
          <p className="text-neutral-400">
            Bienvenido a Arma tu pogo
          </p>
        </div>

        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-6">
          <LoginForm
            registered={registered}
            emailConfirmationPending={emailConfirmationPending}
          />
        </div>
      </div>
    </div>
  );
}
