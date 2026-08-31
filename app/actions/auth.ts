/**
 * Acciones del servidor para autenticación
 * Ejecutan lógica sensible en el servidor, nunca en el cliente
 *
 * @see https://nextjs.org/docs/app/building-application-features/actions
 * @see AGENTS.md § 10. AUTENTICACIÓN Y AUTORIZACIÓN
 */

"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  registerSchemaWithConfirm,
  loginSchema,
  type RegisterInputWithConfirm,
  type LoginInput,
} from "@/lib/validations/auth";
import { normalizeError, ValidationError } from "@/utils/errors";

/**
 * Registra un nuevo usuario con su perfil
 *
 * @param input - Datos de registro validados
 * @returns Error si falla, redirige si éxito
 */
export async function registerUser(input: RegisterInputWithConfirm) {
  try {
    // Validar entrada
    const validatedInput = registerSchemaWithConfirm.parse(input);

    const supabase = await createClient();

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validatedInput.email,
      password: validatedInput.password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        data: {
          first_name: validatedInput.firstName,
          last_name: validatedInput.lastName,
          role: validatedInput.role,
        },
      },
    });

    if (authError) {
      // Manejar error común: usuario ya existe
      if (authError.message.includes("already registered")) {
        throw new ValidationError("El email ya está registrado", {
          field: "email",
        });
      }
      throw authError;
    }

    if (!authData.user) {
      throw new Error("Usuario no fue creado correctamente");
    }

    // 2. Crear perfil del usuario
    const { error: profileError } = await supabase
      .from("profile_users")
      .insert({
        id: authData.user.id,
        email: validatedInput.email,
        first_name: validatedInput.firstName,
        last_name: validatedInput.lastName,
        role: validatedInput.role,
      });

    if (profileError) {
      // Limpiar: eliminar usuario de auth si falla el perfil
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    // Redirigir a login (usuario necesita confirmar email o puede loguear directamente)
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
 * Autentica un usuario existente
 *
 * @param input - Email y contraseña
 * @returns Error si falla, redirige al dashboard si éxito
 */
export async function loginUser(input: LoginInput) {
  try {
    // Validar entrada
    const validatedInput = loginSchema.parse(input);

    const supabase = await createClient();

    // Autenticar con Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validatedInput.email,
      password: validatedInput.password,
    });

    if (error) {
      // Usar mensaje genérico por seguridad
      throw new ValidationError("Email o contraseña incorrectos");
    }

    if (!data.session) {
      throw new Error("No se estableció sesión");
    }

    // Redirigir al dashboard
    redirect("/dashboard");
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
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
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
 * Obtiene el usuario actual autenticado
 * Se usa en Server Components
 */
export async function getCurrentUser() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    if (!user) {
      return null;
    }

    // Obtener perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from("profile_users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      throw profileError;
    }

    return profile;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

/**
 * Obtiene el usuario actual para uso en rutas API
 * Útil para proteger endpoints
 */
export async function getCurrentUserForApi() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}
