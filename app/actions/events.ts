/**
 * Server Actions para Eventos
 * 
 * @see docs/spec.md H3, H4, H10
 * @see AGENTS.md § 7. ARQUITECTURA & § 10. AUTORIZACIÓN
 */

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma, EstadoEvento } from "@prisma/client";
import { getCurrentUser } from "@/app/actions/auth";
import { eventoSchema, type EventoInput } from "@/lib/validations/events";
import { normalizeError, AuthorizationError, NotFoundError } from "@/lib/errors";

/**
 * Crea un nuevo evento para el organizador autenticado
 */
export async function createEvent(input: EventoInput) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthorizationError("Debes iniciar sesión para publicar un evento");
    }

    if (user.rol !== "ORGANIZADOR") {
      throw new AuthorizationError("Solo los usuarios con rol de Organizador pueden publicar eventos");
    }

    const validatedData = eventoSchema.parse(input);

    const event = await prisma.evento.create({
      data: {
        organizadorId: user.id,
        titulo: validatedData.titulo,
        descripcion: validatedData.descripcion || null,
        fechaEvento: new Date(validatedData.fechaEvento),
        ubicacion: validatedData.ubicacion,
        nombreLugar: validatedData.nombreLugar || null,
        ciudad: validatedData.ciudad || null,
        cantidadMusicosRequerida: validatedData.cantidadMusicosRequerida,
        cacheOfrecido: validatedData.cacheOfrecido ?? null,
        estado: (validatedData.estado as EstadoEvento) || "PUBLICADO",
        bannerUrl: validatedData.bannerUrl || null,
      },
    });

    revalidatePath("/dashboard/organizer");
    revalidatePath("/events");

    return {
      success: true,
      data: event,
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
 * Actualiza un evento existente (solo el organizador propietario)
 */
export async function updateEvent(id: string, input: Partial<EventoInput>) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthorizationError("No autenticado");
    }

    const existing = await prisma.evento.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError("Evento");
    }

    if (existing.organizadorId !== user.id) {
      throw new AuthorizationError("No tienes permisos para modificar este evento");
    }

    const validatedData = eventoSchema.partial().parse(input);

    const updated = await prisma.evento.update({
      where: { id },
      data: {
        ...(validatedData.titulo !== undefined && { titulo: validatedData.titulo }),
        ...(validatedData.descripcion !== undefined && { descripcion: validatedData.descripcion || null }),
        ...(validatedData.fechaEvento !== undefined && { fechaEvento: new Date(validatedData.fechaEvento) }),
        ...(validatedData.ubicacion !== undefined && { ubicacion: validatedData.ubicacion }),
        ...(validatedData.nombreLugar !== undefined && { nombreLugar: validatedData.nombreLugar || null }),
        ...(validatedData.ciudad !== undefined && { ciudad: validatedData.ciudad || null }),
        ...(validatedData.cantidadMusicosRequerida !== undefined && { cantidadMusicosRequerida: validatedData.cantidadMusicosRequerida }),
        ...(validatedData.cacheOfrecido !== undefined && { cacheOfrecido: validatedData.cacheOfrecido ?? null }),
        ...(validatedData.estado !== undefined && { estado: validatedData.estado as EstadoEvento }),
        ...(validatedData.bannerUrl !== undefined && { bannerUrl: validatedData.bannerUrl || null }),
      },
    });

    revalidatePath("/dashboard/organizer");
    revalidatePath(`/events/${id}`);
    revalidatePath("/events");

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
 * Cancela un evento
 */
export async function cancelEvent(id: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthorizationError("No autenticado");
    }

    const existing = await prisma.evento.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError("Evento");
    }

    if (existing.organizadorId !== user.id) {
      throw new AuthorizationError("No tienes permisos para cancelar este evento");
    }

    const updated = await prisma.evento.update({
      where: { id },
      data: {
        estado: "CANCELADO",
      },
    });

    revalidatePath("/dashboard/organizer");
    revalidatePath(`/events/${id}`);
    revalidatePath("/events");

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
 * Obtiene los eventos creados por el organizador autenticado
 */
export async function getMyEvents() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return [];
    }

    const events = await prisma.evento.findMany({
      where: { organizadorId: user.id },
      orderBy: { fechaEvento: "asc" },
      include: {
        contrataciones: {
          select: {
            id: true,
            estado: true,
            montoPactado: true,
            proyectoMusical: {
              select: {
                id: true,
                nombre: true,
                genero: true,
              },
            },
          },
        },
      },
    });

    return events;
  } catch (error) {
    console.warn("Could not fetch my events:", (error as Error).message);
    return [];
  }
}

/**
 * Obtiene un evento por ID
 */
export async function getEventById(id: string) {
  try {
    const event = await prisma.evento.findUnique({
      where: { id },
      include: {
        organizador: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            fotoPerfilUrl: true,
          },
        },
        contrataciones: {
          where: {
            estado: "ACORDADO",
          },
          include: {
            proyectoMusical: {
              select: {
                id: true,
                nombre: true,
                genero: true,
                imagenUrl: true,
                spotifyUrl: true,
                youtubeUrl: true,
                instagramUrl: true,
                sitioWebUrl: true,
              },
            },
          },
        },
        entradas: true,
      },
    });

    return event;
  } catch (error) {
    console.warn("Could not fetch event by ID:", (error as Error).message);
    return null;
  }
}

/**
 * Cartelera pública de eventos con filtros
 */
export async function getPublicEvents(filters?: {
  city?: string;
  search?: string;
  status?: EstadoEvento;
}) {
  try {
    const where: Prisma.EventoWhereInput = {
      estado: filters?.status || "PUBLICADO",
    };

    if (filters?.city) {
      where.ciudad = { contains: filters.city, mode: "insensitive" };
    }

    if (filters?.search) {
      where.OR = [
        { titulo: { contains: filters.search, mode: "insensitive" } },
        { descripcion: { contains: filters.search, mode: "insensitive" } },
        { ubicacion: { contains: filters.search, mode: "insensitive" } },
        { nombreLugar: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const events = await prisma.evento.findMany({
      where,
      orderBy: { fechaEvento: "asc" },
      include: {
        organizador: {
          select: {
            nombre: true,
            apellido: true,
          },
        },
        contrataciones: {
          where: { estado: "ACORDADO" },
          select: {
            id: true,
            proyectoMusical: {
              select: {
                id: true,
                nombre: true,
                genero: true,
                imagenUrl: true,
              },
            },
          },
        },
      },
    });

    return events;
  } catch (error) {
    console.warn("Could not fetch public events:", (error as Error).message);
    return [];
  }
}