/**
 * Server Actions para Eventos.
 *
 * @see docs/spec.md H4
 * @see AGENTS.md § 7. ARQUITECTURA & § 10. AUTORIZACIÓN
 */

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/api-helpers";
import { ownedEventWhere, requireRole } from "@/lib/authorization";
import { normalizeError, NotFoundError } from "@/lib/errors";
import { eventoSchema, type EventoInput } from "@/lib/validations/events";
import {
  cancelOwnedEvent,
  eventCreateData,
  eventUpdateData,
  privateEventInclude,
  publicEventDetailSelect,
  publicEventListSelect,
  publicEventListWhere,
  validateEventDates,
  validateEventUpdate,
} from "@/lib/event-access";

export async function createEvent(input: EventoInput) {
  try {
    const user = await requireAuthenticatedUser();
    requireRole(user, "ORGANIZADOR");

    const validatedData = eventoSchema.parse(input);
    validateEventDates(validatedData);

    const event = await prisma.evento.create({
      data: eventCreateData(user.id, validatedData),
    });

    revalidatePath("/dashboard/organizer");
    revalidatePath("/events");

    return { success: true, data: event };
  } catch (error) {
    const normalized = normalizeError(error);
    return {
      error: true,
      message: normalized.message,
      code: normalized.code,
    };
  }
}

export async function updateEvent(id: string, input: Partial<EventoInput>) {
  try {
    const user = await requireAuthenticatedUser();
    requireRole(user, "ORGANIZADOR");

    const existing = await prisma.evento.findFirst({
      where: ownedEventWhere(id, user.id),
      include: { contrataciones: { select: { estado: true } } },
    });
    if (!existing) throw new NotFoundError("Evento");

    const validatedData = eventoSchema.partial().parse(input);
    validateEventUpdate(existing, validatedData);

    const updated = await prisma.evento.update({
      where: { id, organizadorId: user.id },
      data: eventUpdateData(validatedData),
    });

    revalidatePath("/dashboard/organizer");
    revalidatePath(`/events/${id}`);
    revalidatePath("/events");

    return { success: true, data: updated };
  } catch (error) {
    const normalized = normalizeError(error);
    return {
      error: true,
      message: normalized.message,
      code: normalized.code,
    };
  }
}

export async function cancelEvent(id: string) {
  try {
    const user = await requireAuthenticatedUser();
    requireRole(user, "ORGANIZADOR");

    const updated = await cancelOwnedEvent(id, user.id);

    revalidatePath("/dashboard/organizer");
    revalidatePath(`/events/${id}`);
    revalidatePath("/events");

    return { success: true, data: updated };
  } catch (error) {
    const normalized = normalizeError(error);
    return {
      error: true,
      message: normalized.message,
      code: normalized.code,
    };
  }
}

export async function getMyEvents() {
  const user = await requireAuthenticatedUser();
  requireRole(user, "ORGANIZADOR");

  return prisma.evento.findMany({
    where: { organizadorId: user.id },
    orderBy: { startsAt: "asc" },
    include: privateEventInclude,
  });
}

/** Obtiene el detalle privado de un evento propio, incluso si está cancelado. */
export async function getMyEventById(id: string) {
  const user = await requireAuthenticatedUser();
  requireRole(user, "ORGANIZADOR");

  const event = await prisma.evento.findFirst({
    where: ownedEventWhere(id, user.id),
    include: privateEventInclude,
  });

  if (!event) throw new NotFoundError("Evento");
  return event;
}

/** Obtiene un evento PUBLICADO para la página pública de detalle. */
export async function getEventById(id: string) {
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

export async function getPublicEvents(filters?: {
  city?: string;
  search?: string;
}) {
  try {
    return await prisma.evento.findMany({
      where: publicEventListWhere(new Date(), filters),
      orderBy: { startsAt: "asc" },
      select: publicEventListSelect,
    });
  } catch (error) {
    console.warn("Could not fetch public events:", (error as Error).message);
    return [];
  }
}
