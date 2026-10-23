/**
 * Página de login
 * Server Component
 */

import { LoginForm } from "@/components/auth/LoginForm";
import { AuthShell } from "@/components/auth/AuthShell";

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
    <AuthShell
      eyebrow="Acceso a la escena"
      title="Iniciar sesión"
      subtitle="Bienvenido a Arma tu pogo"
    >
      <LoginForm
        registered={registered}
        emailConfirmationPending={emailConfirmationPending}
      />
    </AuthShell>
  );
}
