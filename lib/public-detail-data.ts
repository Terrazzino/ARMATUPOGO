import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { publicEventDetailSelect } from "@/lib/event-access";
import { publicProjectDetailSelect } from "@/lib/project-access";

/** Lectura pública sin memoización para consumidores fuera del render RSC. */
export async function findPublicEventDetailById(id: string) {
  try {
    return await prisma.evento.findFirst({
      where: { id, estado: "PUBLICADO" },
      select: publicEventDetailSelect,
    });
  } catch (error) {
    console.warn("Could not fetch event by ID:", (error as Error).message);
    return null;
  }
}

/** Lectura pública sin memoización para consumidores fuera del render RSC. */
export async function findPublicProjectDetailById(id: string) {
  try {
    return await prisma.proyectoMusical.findFirst({
      where: { id, estaActivo: true },
      select: publicProjectDetailSelect,
    });
  } catch (error) {
    console.warn("Could not fetch project by ID:", (error as Error).message);
    return null;
  }
}

/**
 * React descarta esta memoización al finalizar la solicitud de render.
 * Sólo comparte el detalle público equivalente entre metadata y página.
 */
export const getPublicEventDetailForRender = cache(findPublicEventDetailById);
export const getPublicProjectDetailForRender = cache(findPublicProjectDetailById);
