/**
 * Página de registro
 * Server Component
 */

import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata = {
  title: "Registrarse - Arma tu pogo",
  description: "Crea tu cuenta en Arma tu pogo",
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Crear cuenta
          </h1>
          <p className="text-neutral-400">
            Únete a Arma tu pogo, el marketplace de recitales
          </p>
        </div>

        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-6">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
