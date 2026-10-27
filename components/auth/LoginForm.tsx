/**
 * Formulario de login
 * Client Component para interactividad
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginSchema } from "@/lib/validations/auth";
import { loginUser } from "@/app/actions/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { LoginInput } from "@/lib/validations/auth";

interface LoginFormProps {
  registered?: boolean;
  emailConfirmationPending?: boolean;
}

export function LoginForm({
  registered = false,
  emailConfirmationPending = false,
}: LoginFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setIsLoading(true);
    setServerError(null);

    const result = await loginUser(data);

    if (result?.error) {
      setServerError(result.message);
      setIsLoading(false);
      return;
    }

    // Si no hay error, la acción redirige automáticamente
    router.push("/dashboard");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {registered && !emailConfirmationPending && (
        <div className="atp-feedback atp-feedback-success" role="status">
          <p>Registro exitoso! Por favor inicia sesión.</p>
        </div>
      )}

      {emailConfirmationPending && (
        <div className="atp-feedback" role="status">
          <p>Tu cuenta fue creada. Revisa tu correo y confirma tu email antes de iniciar sesión.</p>
        </div>
      )}

      <div>
        <label htmlFor="email" className="atp-label mb-2 block">
          Email
        </label>
        <input
          {...register("email")}
          type="email"
          id="email"
          placeholder="tu@email.com"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "login-email-error" : undefined}
          className="atp-field"
          disabled={isLoading}
        />
        {errors.email && (
          <p id="login-email-error" className="mt-1.5 text-sm font-medium text-red-300">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="password"
          className="atp-label mb-2 block"
        >
          Contraseña
        </label>
        <input
          {...register("password")}
          type="password"
          id="password"
          placeholder="••••••••"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "login-password-error" : undefined}
          className="atp-field"
          disabled={isLoading}
        />
        {errors.password && (
          <p id="login-password-error" className="mt-1.5 text-sm font-medium text-red-300">
            {errors.password.message}
          </p>
        )}
      </div>

      {serverError && (
        <div className="atp-feedback atp-feedback-error" role="alert">
          <p>{serverError}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        aria-busy={isLoading}
        className="atp-button atp-button-primary w-full uppercase tracking-wider"
      >
        {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
      </button>

      <p className="border-t border-neutral-800 pt-4 text-center text-sm text-neutral-400">
        ¿No tienes cuenta?{" "}
        <Link
          href="/auth/register"
          className="font-bold text-red-400 underline-offset-4 hover:text-red-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          Regístrate aquí
        </Link>
      </p>
    </form>
  );
}
