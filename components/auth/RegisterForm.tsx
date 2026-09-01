/**
 * Formulario de registro de usuario
 * Client Component para interactividad
 */

"use client";

import { useState } from "react";
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-md">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
          Email
        </label>
        <input
          {...register("email")}
          type="email"
          id="email"
          placeholder="tu@email.com"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        {errors.email && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="nombre"
            className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
          >
            Nombre
          </label>
          <input
            {...register("nombre")}
            type="text"
            id="nombre"
            placeholder="Juan"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          {errors.nombre && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              {errors.nombre.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="apellido"
            className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
          >
            Apellido
          </label>
          <input
            {...register("apellido")}
            type="text"
            id="apellido"
            placeholder="Pérez"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          {errors.apellido && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              {errors.apellido.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="rol" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          ¿Cuál es tu rol?
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              {...register("rol")}
              type="radio"
              value="MUSICO"
              disabled={isLoading}
              className="w-4 h-4 text-blue-500 cursor-pointer"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">
              Soy músico
            </span>
          </label>
          <label className="flex items-center">
            <input
              {...register("rol")}
              type="radio"
              value="ORGANIZADOR"
              disabled={isLoading}
              className="w-4 h-4 text-blue-500 cursor-pointer"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">
              Soy organizador de eventos
            </span>
          </label>
        </div>
        {errors.rol && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
            {errors.rol.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
        >
          Contraseña
        </label>
        <input
          {...register("password")}
          type="password"
          id="password"
          placeholder="••••••••"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        {errors.password && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
            {errors.password.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
        >
          Confirmar contraseña
        </label>
        <input
          {...register("confirmPassword")}
          type="password"
          id="confirmPassword"
          placeholder="••••••••"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <label className="flex items-start cursor-pointer">
        <input
          {...register("agreeTerms")}
          type="checkbox"
          disabled={isLoading}
          className="w-4 h-4 mt-1 text-blue-500"
        />
        <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">
          Acepto los términos y condiciones de Arma tu pogo
        </span>
      </label>
      {errors.agreeTerms && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {errors.agreeTerms.message}
        </p>
      )}

      {serverError && (
        <div className="p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-200">{serverError}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
      >
        {isLoading ? "Registrando..." : "Registrarse"}
      </button>

      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        ¿Ya tienes cuenta?{" "}
        <a
          href="/auth/login"
          className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          Ingresa aquí
        </a>
      </p>
    </form>
  );
}