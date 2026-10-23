/**
 * Formulario de registro de usuario
 * Client Component para interactividad
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registroSchemaConConfirm, type RegistroInputConConfirm } from "@/lib/validations/auth";
import { registerUser } from "@/app/actions/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

export function RegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistroInputConConfirm>({
    resolver: zodResolver(registroSchemaConConfirm),
    defaultValues: {
      rol: "MUSICO",
      agreeTerms: false,
    },
  });

  async function onSubmit(data: RegistroInputConConfirm) {
    setIsLoading(true);
    setServerError(null);

    const result = await registerUser(data);

    if (result?.error) {
      setServerError(result.message);
      setIsLoading(false);
      return;
    }

    router.push("/auth/login?registered=true");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
          aria-describedby={errors.email ? "register-email-error" : undefined}
          className="atp-field"
          disabled={isLoading}
        />
        {errors.email && (
          <p id="register-email-error" className="mt-1.5 text-sm font-medium text-red-300">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="nombre"
            className="atp-label mb-2 block"
          >
            Nombre
          </label>
          <input
            {...register("nombre")}
            type="text"
            id="nombre"
            placeholder="Juan"
            autoComplete="given-name"
            aria-invalid={Boolean(errors.nombre)}
            aria-describedby={errors.nombre ? "register-name-error" : undefined}
            className="atp-field"
            disabled={isLoading}
          />
          {errors.nombre && (
            <p id="register-name-error" className="mt-1.5 text-sm font-medium text-red-300">
              {errors.nombre.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="apellido"
            className="atp-label mb-2 block"
          >
            Apellido
          </label>
          <input
            {...register("apellido")}
            type="text"
            id="apellido"
            placeholder="Pérez"
            autoComplete="family-name"
            aria-invalid={Boolean(errors.apellido)}
            aria-describedby={errors.apellido ? "register-last-name-error" : undefined}
            className="atp-field"
            disabled={isLoading}
          />
          {errors.apellido && (
            <p id="register-last-name-error" className="mt-1.5 text-sm font-medium text-red-300">
              {errors.apellido.message}
            </p>
          )}
        </div>
      </div>

      <fieldset aria-describedby={errors.rol ? "register-role-error" : undefined}>
        <legend className="atp-label mb-2">¿Cuál es tu rol?</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="atp-card flex cursor-pointer items-center p-3 has-[:checked]:border-red-600 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-red-500">
            <input
              {...register("rol")}
              type="radio"
              value="MUSICO"
              disabled={isLoading}
              className="h-4 w-4 cursor-pointer accent-red-600 focus-visible:outline-none"
            />
            <span className="ml-2 font-semibold text-neutral-200">
              Soy músico
            </span>
          </label>
          <label className="atp-card flex cursor-pointer items-center p-3 has-[:checked]:border-red-600 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-red-500">
            <input
              {...register("rol")}
              type="radio"
              value="ORGANIZADOR"
              disabled={isLoading}
              className="h-4 w-4 cursor-pointer accent-red-600 focus-visible:outline-none"
            />
            <span className="ml-2 font-semibold text-neutral-200">
              Soy organizador de eventos
            </span>
          </label>
        </div>
        {errors.rol && (
          <p id="register-role-error" className="mt-1.5 text-sm font-medium text-red-300">
            {errors.rol.message}
          </p>
        )}
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "register-password-error" : undefined}
            className="atp-field"
            disabled={isLoading}
          />
          {errors.password && (
            <p id="register-password-error" className="mt-1.5 text-sm font-medium text-red-300">
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="atp-label mb-2 block"
          >
            Confirmar contraseña
          </label>
          <input
            {...register("confirmPassword")}
            type="password"
            id="confirmPassword"
            placeholder="••••••••"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={errors.confirmPassword ? "register-confirm-password-error" : undefined}
            className="atp-field"
            disabled={isLoading}
          />
          {errors.confirmPassword && (
            <p id="register-confirm-password-error" className="mt-1.5 text-sm font-medium text-red-300">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>
      </div>

      <label className="flex cursor-pointer items-start rounded-sm py-1 text-neutral-300 focus-within:ring-2 focus-within:ring-red-500 focus-within:ring-offset-2 focus-within:ring-offset-neutral-900">
        <input
          {...register("agreeTerms")}
          type="checkbox"
          id="agreeTerms"
          disabled={isLoading}
          aria-invalid={Boolean(errors.agreeTerms)}
          aria-describedby={errors.agreeTerms ? "register-terms-error" : undefined}
          className="mt-1 h-4 w-4 shrink-0 accent-red-600 focus-visible:outline-none"
        />
        <span className="ml-2 text-sm">
          Acepto los términos y condiciones de Arma tu pogo
        </span>
      </label>
      {errors.agreeTerms && (
        <p id="register-terms-error" className="text-sm font-medium text-red-300">
          {errors.agreeTerms.message}
        </p>
      )}

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
        {isLoading ? "Registrando..." : "Registrarse"}
      </button>

      <p className="border-t border-neutral-800 pt-5 text-center text-sm text-neutral-400">
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/auth/login"
          className="font-bold text-red-400 underline-offset-4 hover:text-red-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          Ingresa aquí
        </Link>
      </p>
    </form>
  );
}
