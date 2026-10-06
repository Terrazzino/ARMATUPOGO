/**
 * Acciones del servidor para autenticación
 * Ejecutan lógica sensible en el servidor con Prisma y Zod
 *
 * @see AGENTS.md § 8. ACCESO A DATOS Y SERVICIOS: PRISMA Y SUPABASE
 * @see AGENTS.md § 10. AUTENTICACIÓN Y AUTORIZACIÓN
 */

"use server";

import { redirect } from "next/navigation";
import { authService } from "@/lib/services/auth-service";
import { prisma } from "@/lib/prisma";
import {
  registroSchemaConConfirm,
  loginSchema,
  type RegistroInputConConfirm,
  type LoginInput,
} from "@/lib/validations/auth";
import { normalizeError, ValidationError } from "@/lib/errors";
import { getAuthenticatedUser } from "@/lib/api-helpers";

/**
 * Registra un nuevo usuario en Supabase Auth y crea su perfil en PostgreSQL vía Prisma (modelo Usuario)
 */
export async function registerUser(input: RegistroInputConConfirm) {
  let redirectPath = "/auth/login?registered=true&confirmation=pending";

  try {
    const validatedInput = registroSchemaConConfirm.parse(input);

    // 1. Crear identidad mediante el servicio aislado de autenticación
    const { userId, hasSession } = await authService.signUp({
      email: validatedInput.email,
      password: validatedInput.password,
      userData: {
        firstName: validatedInput.nombre,
        lastName: validatedInput.apellido,
        role: validatedInput.rol,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback`,
    });

    // 2. Crear el perfil en la base de datos usando el modelo Usuario de Prisma
    try {
      await prisma.usuario.create({
        data: {
          id: userId,
          email: validatedInput.email.toLowerCase().trim(),
          nombre: validatedInput.nombre.trim(),
          apellido: validatedInput.apellido.trim(),
          rol: validatedInput.rol,
        },
      });
    } catch (dbError) {
      console.error("Error creating Usuario via Prisma:", dbError);
      throw new ValidationError(
        "No se pudo registrar el perfil de usuario. Por favor intenta de nuevo."
      );
    }

    if (hasSession) {
      redirectPath = validatedInput.rol === "MUSICO"
        ? "/dashboard/musician"
        : "/dashboard/organizer";
    }
  } catch (error) {
    const normalizedError = normalizeError(error);
    return {
      error: true,
      message: normalizedError.message,
      code: normalizedError.code,
    };
  }

  redirect(redirectPath);
}

/**
 * Autentica un usuario existente con Supabase Auth y obtiene su rol en Prisma
 */
export async function loginUser(input: LoginInput) {
  let redirectPath = "/dashboard";

  try {
    const validatedInput = loginSchema.parse(input);

    // 1. Iniciar sesión mediante el servicio aislado de autenticación
    const { userId } = await authService.signIn({
      email: validatedInput.email.toLowerCase().trim(),
      password: validatedInput.password,
    });

    // 2. Obtener rol desde Prisma para redirección personalizada
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { rol: true },
    });

    if (usuario?.rol === "MUSICO") {
      redirectPath = "/dashboard/musician";
    } else if (usuario?.rol === "ORGANIZADOR") {
      redirectPath = "/dashboard/organizer";
    }
  } catch (error) {
    const normalizedError = normalizeError(error);
    return {
      error: true,
      message: normalizedError.message,
      code: normalizedError.code,
    };
  }

  redirect(redirectPath);
}

/**
 * Cierra la sesión del usuario actual
 */
export async function logoutUser() {
  try {
    await authService.signOut();
  } catch (error) {
    const normalizedError = normalizeError(error);
    return {
      error: true,
      message: normalizedError.message,
      code: normalizedError.code,
    };
  }

  redirect("/");
}

/**
 * Obtiene el usuario autenticado desde Prisma (modelo Usuario)
 */
export async function getCurrentUser() {
  return getAuthenticatedUser();
}
