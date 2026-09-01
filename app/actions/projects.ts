/**
 * Server Actions para Proyectos Musicales
 * 
 * @see docs/spec.md H2, H5
 * @see AGENTS.md § 7. ARQUITECTURA & § 10. AUTORIZACIÓN
 */

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/app/actions/auth";
import { proyectoMusicalSchema, type ProyectoMusicalInput } from "@/lib/validations/projects";
import { normalizeError, AuthorizationError, NotFoundError } from "@/lib/errors";

/**
 * Crea un nuevo proyecto musical para el músico autenticado
 */
export async function createProject(input: ProyectoMusicalInput) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthorizationError("Debes iniciar sesión para crear un proyecto");
    }

    if (user.rol !== "MUSICO") {
      throw new AuthorizationError("Solo los usuarios con rol de Músico pueden registrar proyectos");
    }

    const validatedData = proyectoMusicalSchema.parse(input);

    const project = await prisma.proyectoMusical.create({
      data: {
        usuarioId: user.id,
        nombre: validatedData.nombre,
        genero: validatedData.genero,
        descripcion: validatedData.descripcion || null,
        cacheAproximado: validatedData.cacheAproximado ?? null,
        ubicacion: validatedData.ubicacion || null,
        ciudad: validatedData.ciudad || null,
        imagenUrl: validatedData.imagenUrl || null,
        spotifyUrl: validatedData.spotifyUrl || null,
        youtubeUrl: validatedData.youtubeUrl || null,
        instagramUrl: validatedData.instagramUrl || null,
        sitioWebUrl: validatedData.sitioWebUrl || null,
        enlacesPersonalizados: validatedData.enlacesPersonalizados ?? [],
        estaActivo: true,
      },
    });

    revalidatePath("/dashboard/musician");
    revalidatePath("/projects");

    return {
      success: true,
      data: project,
    };
  } catch (error) {
    const normalized = normalizeError(error);
    return {
      error: true,
      message: normalized.message,
      code: normalized.code,
    };
  }
}

/**
 * Actualiza un proyecto musical propio
 */
export async function updateProject(id: string, input: Partial<ProyectoMusicalInput>) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthorizationError("No autenticado");
    }

    const existing = await prisma.proyectoMusical.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError("Proyecto musical");
    }

    if (existing.usuarioId !== user.id) {
      throw new AuthorizationError("No tienes permisos para modificar este proyecto");
    }

    const validatedData = proyectoMusicalSchema.partial().parse(input);

    const updated = await prisma.proyectoMusical.update({
      where: { id },
      data: {
        ...(validatedData.nombre !== undefined && { nombre: validatedData.nombre }),
        ...(validatedData.genero !== undefined && { genero: validatedData.genero }),
        ...(validatedData.descripcion !== undefined && { descripcion: validatedData.descripcion || null }),
        ...(validatedData.cacheAproximado !== undefined && { cacheAproximado: validatedData.cacheAproximado ?? null }),
        ...(validatedData.ubicacion !== undefined && { ubicacion: validatedData.ubicacion || null }),
        ...(validatedData.ciudad !== undefined && { ciudad: validatedData.ciudad || null }),
        ...(validatedData.imagenUrl !== undefined && { imagenUrl: validatedData.imagenUrl || null }),
        ...(validatedData.spotifyUrl !== undefined && { spotifyUrl: validatedData.spotifyUrl || null }),
        ...(validatedData.youtubeUrl !== undefined && { youtubeUrl: validatedData.youtubeUrl || null }),
        ...(validatedData.instagramUrl !== undefined && { instagramUrl: validatedData.instagramUrl || null }),
        ...(validatedData.sitioWebUrl !== undefined && { sitioWebUrl: validatedData.sitioWebUrl || null }),
        ...(validatedData.enlacesPersonalizados !== undefined && { enlacesPersonalizados: validatedData.enlacesPersonalizados }),
      },
    });

    revalidatePath("/dashboard/musician");
    revalidatePath(`/projects/${id}`);

    return {
      success: true,
      data: updated,
    };
  } catch (error) {
    const normalized = normalizeError(error);
    return {
      error: true,
      message: normalized.message,
      code: normalized.code,
    };
  }
}

/**
 * Activa o desactiva la visibilidad de un proyecto musical
 */
export async function toggleProjectStatus(id: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthorizationError("No autenticado");
    }

    const existing = await prisma.proyectoMusical.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError("Proyecto musical");
    }

    if (existing.usuarioId !== user.id) {
      throw new AuthorizationError("No tienes permisos para modificar este proyecto");
    }

    const updated = await prisma.proyectoMusical.update({
      where: { id },
      data: {
        estaActivo: !existing.estaActivo,
      },
    });

    revalidatePath("/dashboard/musician");

    return {
      success: true,
      data: updated,
    };
  } catch (error) {
    const normalized = normalizeError(error);
    return {
      error: true,
      message: normalized.message,
      code: normalized.code,
    };
  }
}

/**
 * Obtiene todos los proyectos pertenecientes al músico autenticado
 */
export async function getMyProjects() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return [];
    }

    const projects = await prisma.proyectoMusical.findMany({
      where: { usuarioId: user.id },
      orderBy: { creadoEn: "desc" },
    });

    return projects;
  } catch (error) {
    console.warn("Could not fetch my projects:", (error as Error).message);
    return [];
  }
}

/**
 * Obtiene un proyecto musical por su ID (público o privado si es el dueño)
 */
export async function getProjectById(id: string) {
  try {
    const project = await prisma.proyectoMusical.findUnique({
      where: { id },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            fotoPerfilUrl: true,
          },
        },
        valoraciones: {
          select: {
            id: true,
            puntaje: true,
            comentario: true,
            creadoEn: true,
            autor: {
              select: {
                nombre: true,
                apellido: true,
              },
            },
          },
        },
      },
    });

    return project;
  } catch (error) {
    console.warn("Could not fetch project by ID:", (error as Error).message);
    return null;
  }
}

/**
 * Obtiene la lista de proyectos públicos activos para la cartelera / búsqueda
 */
export async function getPublicProjects(filters?: {
  genre?: string;
  city?: string;
  search?: string;
}) {
  try {
    const where: Prisma.ProyectoMusicalWhereInput = {
      estaActivo: true,
    };

    if (filters?.genre) {
      where.genero = { contains: filters.genre, mode: "insensitive" };
    }

    if (filters?.city) {
      where.ciudad = { contains: filters.city, mode: "insensitive" };
    }

    if (filters?.search) {
      where.OR = [
        { nombre: { contains: filters.search, mode: "insensitive" } },
        { descripcion: { contains: filters.search, mode: "insensitive" } },
        { genero: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const projects = await prisma.proyectoMusical.findMany({
      where,
      orderBy: { creadoEn: "desc" },
      include: {
        usuario: {
          select: {
            nombre: true,
            apellido: true,
          },
        },
      },
    });

    return projects;
  } catch (error) {
    console.warn("Could not fetch public projects:", (error as Error).message);
    return [];
  }
}