/**
 * Server Actions para Valoraciones y Reputación
 * 
 * @see docs/spec.md H8, H9
 * @see AGENTS.md § 7. ARQUITECTURA & § 10. AUTORIZACIÓN
 */

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/app/actions/auth";
import { crearValoracionSchema, type CrearValoracionInput } from "@/lib/validations/ratings";
import { normalizeError, AuthorizationError, NotFoundError, ValidationError, ConflictError } from "@/lib/errors";

/**
 * Crea una valoración mutua post-evento
 */
export async function createRating(input: CrearValoracionInput) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthorizationError("Debes iniciar sesión para valorar");
    }

    const validated = crearValoracionSchema.parse(input);

    const contract = await prisma.contratacion.findUnique({
      where: { id: validated.contratacionId },
      include: {
        evento: true,
        proyectoMusical: true,
      },
    });

    if (!contract) {
      throw new NotFoundError("Contratación");
    }

    // 1. Validar que la contratación esté cerrada (ACORDADO o COMPLETADO)
    if (contract.estado !== "ACORDADO" && contract.estado !== "COMPLETADO") {
      throw new ValidationError("Solo se pueden valorar contrataciones acordadas o completadas");
    }

    // 2. Validar que el usuario sea participante
    const isMusician = contract.musicoId === user.id;
    const isOrganizer = contract.organizadorId === user.id;

    if (!isMusician && !isOrganizer) {
      throw new AuthorizationError("No participaste de esta contratación");
    }

    // 3. Determinar destinatarioId y proyectoDestinatarioId automáticamente
    const destinatarioId = isMusician ? contract.organizadorId : contract.musicoId;
    const proyectoDestinatarioId = isOrganizer ? contract.proyectoMusicalId : null;

    // 4. Validar que no exista valoración previa de este autor para este contrato
    const existing = await prisma.valoracion.findUnique({
      where: {
        contratacionId_autorId: {
          contratacionId: contract.id,
          autorId: user.id,
        },
      },
    });

    if (existing) {
      throw new ConflictError("Ya realizaste una valoración para esta contratación");
    }

    const rating = await prisma.valoracion.create({
      data: {
        contratacionId: contract.id,
        autorId: user.id,
        destinatarioId,
        proyectoDestinatarioId,
        puntaje: validated.puntaje,
        comentario: validated.comentario || null,
      },
    });

    revalidatePath("/dashboard/musician");
    revalidatePath("/dashboard/organizer");
    if (proyectoDestinatarioId) {
      revalidatePath(`/projects/${proyectoDestinatarioId}`);
    }

    return {
      success: true,
      data: rating,
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
 * Obtiene las valoraciones recibidas por un usuario y calcula su reputación
 */
export async function getUserReputation(userId: string) {
  try {
    const ratings = await prisma.valoracion.findMany({
      where: { destinatarioId: userId },
      orderBy: { creadoEn: "desc" },
      include: {
        autor: {
          select: {
            nombre: true,
            apellido: true,
            fotoPerfilUrl: true,
          },
        },
      },
    });

    const total = ratings.length;
    const averageScore = total > 0 ? ratings.reduce((acc, r) => acc + r.puntaje, 0) / total : 0;

    return {
      total,
      averageScore: Number(averageScore.toFixed(1)),
      ratings,
    };
  } catch (error) {
    console.warn("Could not fetch user reputation:", (error as Error).message);
    return {
      total: 0,
      averageScore: 0,
      ratings: [],
    };
  }
}

/**
 * Obtiene las valoraciones recibidas por un proyecto musical específico
 */
export async function getProjectReputation(projectId: string) {
  try {
    const ratings = await prisma.valoracion.findMany({
      where: { proyectoDestinatarioId: projectId },
      orderBy: { creadoEn: "desc" },
      include: {
        autor: {
          select: {
            nombre: true,
            apellido: true,
            fotoPerfilUrl: true,
          },
        },
      },
    });

    const total = ratings.length;
    const averageScore = total > 0 ? ratings.reduce((acc, r) => acc + r.puntaje, 0) / total : 0;

    return {
      total,
      averageScore: Number(averageScore.toFixed(1)),
      ratings,
    };
  } catch (error) {
    console.warn("Could not fetch project reputation:", (error as Error).message);
    return {
      total: 0,
      averageScore: 0,
      ratings: [],
    };
  }
}