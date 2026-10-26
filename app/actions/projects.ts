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
import { requireAuthenticatedUserForRender } from "@/lib/auth-render";
import { ownedProjectWhere, requireRole } from "@/lib/authorization";
import {
  projectIdSchema,
  proyectoMusicalSchema,
  type ProyectoMusicalInput,
} from "@/lib/validations/projects";
import { normalizeError, NotFoundError, ValidationError } from "@/lib/errors";
import {
  projectCreateData,
  projectUpdateData,
  publicProjectListSelect,
  publicProjectWhere,
} from "@/lib/project-access";
import { findPublicProjectDetailById } from "@/lib/public-detail-data";
import { getOwnedProjectImagePath } from "@/lib/project-image";
import { removeProjectImage, uploadProjectImage } from "@/lib/services/project-image-storage";

type ProjectImageAction = "keep" | "replace" | "remove";

function parseProjectId(id: string) {
  const result = projectIdSchema.safeParse(id);
  if (!result.success) {
    throw new ValidationError(result.error.issues[0]?.message ?? "ID de proyecto inválido");
  }
  return result.data;
}

function parseProjectInput(input: unknown) {
  const result = proyectoMusicalSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(result.error.issues[0]?.message ?? "Datos del proyecto inválidos");
  }
  return result.data;
}

function parseProjectUpdate(input: unknown) {
  const result = proyectoMusicalSchema.partial().safeParse(input);
  if (!result.success) {
    throw new ValidationError(result.error.issues[0]?.message ?? "Datos del proyecto inválidos");
  }
  return result.data;
}

function parseProjectFormData(formData: FormData) {
  const rawProject = formData.get("project");
  if (typeof rawProject !== "string") {
    throw new ValidationError("Los datos del proyecto son inválidos");
  }

  let input: unknown;
  try {
    input = JSON.parse(rawProject);
  } catch {
    throw new ValidationError("Los datos del proyecto son inválidos");
  }

  // La URL se deriva exclusivamente del resultado de Storage. No se acepta
  // una referencia arbitraria enviada dentro del payload multipart.
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const sanitized = { ...(input as Record<string, unknown>) };
    delete sanitized.imagenUrl;
    input = sanitized;
  }

  const rawAction = formData.get("imageAction");
  const imageAction: ProjectImageAction =
    rawAction === "replace" || rawAction === "remove" ? rawAction : "keep";
  const image = formData.get("image");

  if (imageAction === "replace" && (!(image instanceof File) || image.size === 0)) {
    throw new ValidationError("Seleccioná una imagen para reemplazar la actual");
  }

  return {
    input,
    imageAction,
    image: imageAction === "replace" ? image as File : null,
  };
}

/**
 * Crea un nuevo proyecto musical para el músico autenticado
 */
export async function createProject(input: ProyectoMusicalInput | FormData) {
  let uploadedPath: string | null = null;
  let provisionalProjectId: string | null = null;
  let provisionalOwnerId: string | null = null;
  try {
    const user = await requireAuthenticatedUser();
    requireRole(user, "MUSICO");

    const submission = input instanceof FormData
      ? parseProjectFormData(input)
      : { input, imageAction: "keep" as const, image: null };
    const validatedData = parseProjectInput(submission.input);
    const projectId = crypto.randomUUID();

    const requestedImageUrl = input instanceof FormData ? null : validatedData.imagenUrl || null;
    const hasUploadedImage = submission.imageAction === "replace" && submission.image;
    let project;

    if (hasUploadedImage) {
      // La fila provisional, todavía inactiva y sin URL, permite que la RLS de
      // Storage compruebe que el projectId existe y pertenece al usuario.
      await prisma.proyectoMusical.create({
        data: {
          ...projectCreateData(user.id, { ...validatedData, imagenUrl: "" }),
          id: projectId,
          estaActivo: false,
        },
      });
      provisionalProjectId = projectId;
      provisionalOwnerId = user.id;

      const uploaded = await uploadProjectImage(user.id, projectId, hasUploadedImage);
      uploadedPath = uploaded.path;

      project = await prisma.proyectoMusical.update({
        where: { id: projectId, usuarioId: user.id },
        data: { imagenUrl: uploaded.publicUrl, estaActivo: true },
      });
    } else {
      project = await prisma.proyectoMusical.create({
        data: {
          ...projectCreateData(user.id, { ...validatedData, imagenUrl: requestedImageUrl ?? "" }),
          id: projectId,
        },
      });
    }
    uploadedPath = null;
    provisionalProjectId = null;
    provisionalOwnerId = null;

    revalidatePath("/dashboard/musician");
    revalidatePath("/projects");

    return {
      success: true,
      data: project,
    };
  } catch (error) {
    if (uploadedPath) await removeProjectImage(uploadedPath);
    if (provisionalProjectId && provisionalOwnerId) {
      try {
        await prisma.proyectoMusical.deleteMany({
          where: {
            id: provisionalProjectId,
            usuarioId: provisionalOwnerId,
            estaActivo: false,
            imagenUrl: null,
          },
        });
      } catch (cleanupError) {
        console.warn("[projects] provisional project cleanup failed", {
          errorType: cleanupError instanceof Error ? cleanupError.name : "unknown",
        });
      }
    }
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
export async function updateProject(id: string, input: Partial<ProyectoMusicalInput> | FormData) {
  let uploadedPath: string | null = null;
  try {
    const user = await requireAuthenticatedUser();
    requireRole(user, "MUSICO");
    const projectId = parseProjectId(id);

    const existing = await prisma.proyectoMusical.findFirst({
      where: ownedProjectWhere(projectId, user.id),
    });

    if (!existing) {
      throw new NotFoundError("Proyecto musical");
    }

    const submission = input instanceof FormData
      ? parseProjectFormData(input)
      : { input, imageAction: "keep" as const, image: null };
    const validatedData = parseProjectUpdate(submission.input);

    let nextImageUrl = existing.imagenUrl;
    if (submission.imageAction === "replace" && submission.image) {
      const uploaded = await uploadProjectImage(user.id, projectId, submission.image);
      uploadedPath = uploaded.path;
      nextImageUrl = uploaded.publicUrl;
    } else if (submission.imageAction === "remove") {
      nextImageUrl = null;
    }

    const updated = await prisma.proyectoMusical.update({
      where: { id: projectId, usuarioId: user.id },
      data: {
        ...projectUpdateData(validatedData),
        ...(submission.imageAction !== "keep" && { imagenUrl: nextImageUrl }),
      },
    });
    const committedUploadedPath = uploadedPath;
    uploadedPath = null;

    let warning: string | undefined;
    if (submission.imageAction !== "keep") {
      const previousPath = getOwnedProjectImagePath(existing.imagenUrl, user.id, projectId);
      if (previousPath && previousPath !== committedUploadedPath) {
        const removed = await removeProjectImage(previousPath);
        if (!removed) {
          warning = "El proyecto se guardó, pero quedó una imagen anterior pendiente de limpieza.";
        }
      }
    }

    revalidatePath("/dashboard/musician");
    revalidatePath(`/projects/${projectId}`);

    return {
      success: true,
      data: updated,
      ...(warning && { warning }),
    };
  } catch (error) {
    if (uploadedPath) await removeProjectImage(uploadedPath);
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
  const user = await requireAuthenticatedUserForRender();
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
  return findPublicProjectDetailById(id);
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
