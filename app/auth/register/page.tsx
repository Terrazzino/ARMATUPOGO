/**
 * Página de registro
 * Server Component
 */

import { RegisterForm } from "@/components/auth/RegisterForm";
import { AuthShell } from "@/components/auth/AuthShell";

export const metadata = {
  title: "Registrarse - Arma tu pogo",
  description: "Crea tu cuenta en Arma tu pogo",
};

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="Sumate a la escena"
      title="Crear cuenta"
      subtitle="Únete a Arma tu pogo, el marketplace de recitales"
      size="wide"
    >
      <RegisterForm />
    </AuthShell>
  );
}
