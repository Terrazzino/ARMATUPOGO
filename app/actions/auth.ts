/**
 * Acciones del servidor para autenticación
 * Ejecutan lógica sensible en el servidor con Prisma y Zod
 *
 * @see AGENTS.md § 8. ACCESO A DATOS Y SERVICIOS: PRISMA Y SUPABASE
 * @see AGENTS.md § 10. AUTENTICACIÓN Y AUTORIZACIÓN
 */

"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  registroSchemaConConfirm,
  loginSchema,
  type RegistroInputConConfirm,
  type LoginInput,
} from "@/lib/validations/auth";
import { normalizeError, ValidationError } from "@/lib/errors";

/**
 * Registra un nuevo usuario en Supabase Auth y crea su perfil en PostgreSQL vía Prisma (modelo Usuario)
 */
export async function registerUser(input: RegistroInputConConfirm) {
  try {
    const validatedInput = registroSchemaConConfirm.parse(input);

    const supabase = await createClient();
    if (!supabase) {
      throw new ValidationError(
        "El servicio de autenticación no está configurado. Verifica las variables de entorno."
      );
    }

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validatedInput.email,
      password: validatedInput.password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback`,
        data: {
          first_name: validatedInput.nombre,
          last_name: validatedInput.apellido,
          role: validatedInput.rol,
        },
      },
    });

    if (authError) {
      if (
        authError.message.toLowerCase().includes("already registered") ||
        authError.message.toLowerCase().includes("user already exists")
      ) {
        throw new ValidationError("El email ya se encuentra registrado", {
          field: "email",
        });
      }
      throw authError;
    }

    if (!authData.user) {
      throw new Error("No se pudo crear el usuario en el servicio de autenticación");
    }

    // 2. Crear el perfil en la base de datos usando el modelo Usuario de Prisma
    try {
      await prisma.usuario.create({
        data: {
          id: authData.user.id,
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

    redirect("/auth/login?registered=true");
  } catch (error) {
    const normalizedError = normalizeError(error);
    return {
      error: true,
      message: normalizedError.message,
      code: normalizedError.code,
    };
  }
}

/**
 * Autentica un usuario existente con Supabase Auth y obtiene su rol en Prisma
 */
export async function loginUser(input: LoginInput) {
  try {
    const validatedInput = loginSchema.parse(input);

    const supabase = await createClient();
    if (!supabase) {
      throw new ValidationError(
        "El servicio de autenticación no está configurado. Verifica las variables de entorno."
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: validatedInput.email.toLowerCase().trim(),
      password: validatedInput.password,
    });

    if (error) {
      throw new ValidationError("Email o contraseña incorrectos");
    }

    if (!data.session) {
      throw new Error("No se pudo iniciar sesión. Por favor verifica tus credenciales.");
    }

    // Obtener rol desde Prisma para redirección personalizada
    const usuario = await prisma.usuario.findUnique({
      where: { id: data.user.id },
      select: { rol: true },
    });

    if (usuario?.rol === "MUSICO") {
      redirect("/dashboard/musician");
    } else if (usuario?.rol === "ORGANIZADOR") {
      redirect("/dashboard/organizer");
    } else {
      redirect("/dashboard");
    }
  } catch (error) {
    const normalizedError = normalizeError(error);
    return {
      error: true,
      message: normalizedError.message,
      code: normalizedError.code,
    };
  }
}

/**
 * Cierra la sesión del usuario actual
 */
export async function logoutUser() {
  try {
    const supabase = await createClient();
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    }

    redirect("/");
  } catch (error) {
    const normalizedError = normalizeError(error);
    return {
      error: true,
      message: normalizedError.message,
      code: normalizedError.code,
    };
  }
}

/**
 * Obtiene el usuario autenticado desde Prisma (modelo Usuario)
 */
export async function getCurrentUser() {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return null;
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: user.id },
    });

    return usuario;
  } catch {
    return null;
  }
}