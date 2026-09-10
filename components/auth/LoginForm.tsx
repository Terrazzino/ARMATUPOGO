/**
 * Formulario de login
 * Client Component para interactividad
 */

"use client";

import { useState } from "react";
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-md">
      {registered && !emailConfirmationPending && (
        <div className="p-3 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg">
          <p className="text-sm text-emerald-300">
            Registro exitoso! Por favor inicia sesión.
          </p>
        </div>
      )}

      {emailConfirmationPending && (
        <div className="p-3 bg-amber-950/50 border border-amber-800 rounded-lg">
          <p className="text-sm text-amber-200">
            Tu cuenta fue creada. Revisa tu correo y confirma tu email antes de iniciar sesión.
          </p>
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-1">
          Email
        </label>
        <input
          {...register("email")}
          type="email"
          id="email"
          placeholder="tu@email.com"
          className="w-full px-4 py-2 border border-neutral-600 rounded-lg bg-neutral-800 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500"
          disabled={isLoading}
        />
        {errors.email && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-neutral-300 mb-1"
        >
          Contraseña
        </label>
        <input
          {...register("password")}
          type="password"
          id="password"
          placeholder="••••••••"
          className="w-full px-4 py-2 border border-neutral-600 rounded-lg bg-neutral-800 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500"
          disabled={isLoading}
        />
        {errors.password && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
            {errors.password.message}
          </p>
        )}
      </div>

      {serverError && (
        <div className="p-3 bg-red-950/50 border border-red-800 rounded-lg">
          <p className="text-sm text-red-200">{serverError}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
      >
        {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
      </button>

      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        ¿No tienes cuenta?{" "}
        <a
          href="/auth/register"
          className="text-red-600 dark:text-red-400 hover:underline font-medium"
        >
          Regístrate aquí
        </a>
      </p>
    </form>
  );
}
