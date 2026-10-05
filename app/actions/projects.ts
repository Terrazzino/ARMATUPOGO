/**
 * Server Actions para Proyectos Musicales
 * 
 * @see docs/spec.md H2, H5
 * @see AGENTS.md § 7. ARQUITECTURA & § 10. AUTORIZACIÓN
 */

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/api-helpers";
import { ownedProjectWhere, requireRole } from "@/lib/authorization";
import { proyectoMusicalSchema, type ProyectoMusicalInput } from "@/lib/validations/projects";
import { normalizeError, NotFoundError } from "@/lib/errors";
import {
  projectCreateData,
  projectUpdateData,
  publicProjectDetailSelect,
  publicProjectListSelect,
  publicProjectWhere,
} from "@/lib/project-access";

/**
 * Crea un nuevo proyecto musical para el músico autenticado
 */
export async function createProject(input: ProyectoMusicalInput) {
  try {
    const user = await requireAuthenticatedUser();
    requireRole(user, "MUSICO");

    const validatedData = proyectoMusicalSchema.parse(input);

    const project = await prisma.proyectoMusical.create({
      data: projectCreateData(user.id, validatedData),
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
    const user = await requireAuthenticatedUser();
    requireRole(user, "MUSICO");

    const existing = await prisma.proyectoMusical.findFirst({
      where: ownedProjectWhere(id, user.id),
    });

    if (!existing) {
      throw new NotFoundError("Proyecto musical");
    }

    const validatedData = proyectoMusicalSchema.partial().parse(input);

    const updated = await prisma.proyectoMusical.update({
      where: { id, usuarioId: user.id },
      data: projectUpdateData(validatedData),
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
    const user = await requireAuthenticatedUser();
    requireRole(user, "MUSICO");

    const existing = await prisma.proyectoMusical.findFirst({
      where: ownedProjectWhere(id, user.id),
    });

    if (!existing) {
      throw new NotFoundError("Proyecto musical");
    }

    const updated = await prisma.proyectoMusical.update({
      where: { id, usuarioId: user.id },
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
  const user = await requireAuthenticatedUser();
  requireRole(user, "MUSICO");

  return prisma.proyectoMusical.findMany({
    where: { usuarioId: user.id },
    orderBy: { creadoEn: "desc" },
  });
}

/**
 * Obtiene un proyecto musical activo para su perfil público.
 */
export async function getProjectById(id: string) {
  try {
    const project = await prisma.proyectoMusical.findFirst({
      where: { id, estaActivo: true },
      select: publicProjectDetailSelect,
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
    const projects = await prisma.proyectoMusical.findMany({
      where: publicProjectWhere(filters),
      orderBy: { creadoEn: "desc" },
      select: publicProjectListSelect,
    });

    return projects;
  } catch (error) {
    console.warn("Could not fetch public projects:", (error as Error).message);
    return [];
  }
}
