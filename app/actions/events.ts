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
import { requireAuthenticatedUserForRender } from "@/lib/auth-render";
import { ownedEventWhere, requireRole } from "@/lib/authorization";
import { normalizeError, NotFoundError, ValidationError } from "@/lib/errors";
import { calcularCupos } from "@/lib/cupos";
import { eventIdSchema, eventoSchema, type EventoInput } from "@/lib/validations/events";
import {
  cancelOwnedEvent,
  eventCreateData,
  eventUpdateData,
  privateEventInclude,
  musicianEventListSelect,
  publicEventCardSelect,
  publicEventListOrderBy,
  publicEventListWhere,
  validateEventDates,
  validateEventUpdate,
} from "@/lib/event-access";
import { findPublicEventDetailById } from "@/lib/public-detail-data";
import { getOwnedEventImagePath, validateEventImage } from "@/lib/event-image";
import { removeEventImage, uploadEventImage } from "@/lib/services/event-image-storage";

type EventImageAction = "keep" | "replace" | "remove";

function parseEventId(id: string) {
  const result = eventIdSchema.safeParse(id);
  if (!result.success) throw new ValidationError(result.error.issues[0]?.message ?? "ID de evento inválido");
  return result.data;
}

function parseEventInput(input: unknown, partial = false) {
  const result = (partial ? eventoSchema.partial() : eventoSchema).safeParse(input);
  if (!result.success) throw new ValidationError(result.error.issues[0]?.message ?? "Datos del evento inválidos");
  return result.data;
}

function parseEventFormData(formData: FormData) {
  const rawEvent = formData.get("event");
  if (typeof rawEvent !== "string") throw new ValidationError("Los datos del evento son inválidos");
  let input: unknown;
  try {
    input = JSON.parse(rawEvent);
  } catch {
    throw new ValidationError("Los datos del evento son inválidos");
  }
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const sanitized = { ...(input as Record<string, unknown>) };
    delete sanitized.bannerUrl;
    input = sanitized;
  }
  const rawAction = formData.get("imageAction");
  const imageAction: EventImageAction = rawAction === "replace" || rawAction === "remove" ? rawAction : "keep";
  const image = formData.get("image");
  if (imageAction === "replace" && (!(image instanceof File) || image.size === 0)) {
    throw new ValidationError("Seleccioná un flyer para reemplazar el actual");
  }
  return { input, imageAction, image: imageAction === "replace" ? image as File : null };
}

export async function createEvent(input: EventoInput | FormData) {
  try {
    const user = await requireAuthenticatedUser();
    requireRole(user, "ORGANIZADOR");

    const submission = input instanceof FormData
      ? parseEventFormData(input)
      : { input, imageAction: "keep" as const, image: null };
    const validatedData = parseEventInput(submission.input, false) as EventoInput;
    validateEventDates(validatedData);

    if (submission.imageAction === "replace" && submission.image) {
      await validateEventImage(submission.image);
      throw new ValidationError(
        "Publicá primero el evento sin flyer y agregalo desde Editar evento. El modelo actual no admite una carga provisional privada segura."
      );
    }

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

export async function updateEvent(id: string, input: Partial<EventoInput> | FormData) {
  let uploadedPath: string | null = null;
  try {
    const user = await requireAuthenticatedUser();
    requireRole(user, "ORGANIZADOR");

    const eventId = parseEventId(id);
    const existing = await prisma.evento.findFirst({
      where: ownedEventWhere(eventId, user.id),
      include: { contrataciones: { select: { estado: true } } },
    });
    if (!existing) throw new NotFoundError("Evento");

    const submission = input instanceof FormData
      ? parseEventFormData(input)
      : { input, imageAction: "keep" as const, image: null };
    const validatedData = parseEventInput(submission.input, true) as Partial<EventoInput>;
    validateEventUpdate(existing, validatedData);

    let nextBannerUrl = existing.bannerUrl;
    if (submission.imageAction === "replace" && submission.image) {
      const uploaded = await uploadEventImage(user.id, eventId, submission.image);
      uploadedPath = uploaded.path;
      nextBannerUrl = uploaded.publicUrl;
    } else if (submission.imageAction === "remove") {
      nextBannerUrl = null;
    }

    const updated = await prisma.evento.update({
      where: { id: eventId, organizadorId: user.id },
      data: {
        ...eventUpdateData(validatedData),
        ...(submission.imageAction !== "keep" && { bannerUrl: nextBannerUrl }),
      },
    });
    const committedUploadedPath = uploadedPath;
    uploadedPath = null;

    let warning: string | undefined;
    if (submission.imageAction !== "keep") {
      const previousPath = getOwnedEventImagePath(existing.bannerUrl, user.id, eventId);
      if (previousPath && previousPath !== committedUploadedPath) {
        const removed = await removeEventImage(previousPath);
        if (!removed) warning = "El evento se guardó, pero quedó un flyer anterior pendiente de limpieza.";
      }
    }

    revalidatePath("/dashboard/organizer");
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/events");

    return { success: true, data: updated, ...(warning && { warning }) };
  } catch (error) {
    if (uploadedPath) await removeEventImage(uploadedPath);
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
  const user = await requireAuthenticatedUserForRender();
  requireRole(user, "ORGANIZADOR");

  return prisma.evento.findMany({
    where: { organizadorId: user.id },
    orderBy: { startsAt: "asc" },
    include: privateEventInclude,
  });
}

/** Obtiene el detalle privado de un evento propio, incluso si está cancelado. */
export async function getMyEventById(id: string) {
  const user = await requireAuthenticatedUserForRender();
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
  return findPublicEventDetailById(id);
}

/** Datos privados del músico actual para interpretar su relación con un evento. */
export async function getMusicianEventContext(eventId: string) {
  const user = await requireAuthenticatedUserForRender();
  requireRole(user, "MUSICO");

  const [projects, postulations, contracts] = await Promise.all([
    prisma.proyectoMusical.findMany({
      where: { usuarioId: user.id, estaActivo: true },
      orderBy: { creadoEn: "desc" },
      select: { id: true, nombre: true },
    }),
    prisma.postulacion.findMany({
      where: { musicoId: user.id, eventoId: eventId },
      select: { proyectoMusicalId: true, estado: true },
    }),
    prisma.contratacion.findMany({
      where: { musicoId: user.id, eventoId: eventId },
      select: { proyectoMusicalId: true, estado: true },
    }),
  ]);

  return { projects, postulations, contracts };
}

export async function getPublicEvents(filters?: {
  city?: string;
  search?: string;
}) {
  try {
    return await prisma.evento.findMany({
      where: publicEventListWhere(new Date(), filters),
      orderBy: publicEventListOrderBy,
      select: publicEventCardSelect,
    });
  } catch (error) {
    console.warn("Could not fetch public events:", (error as Error).message);
    return [];
  }
}

const HOME_EVENTS_PAGE_SIZE = 9;

function normalizePage(page: number | undefined, totalPages: number) {
  const requestedPage = normalizeRequestedPage(page);
  return totalPages === 0 ? 1 : Math.min(requestedPage, totalPages);
}

function normalizeRequestedPage(page: number | undefined) {
  return Number.isInteger(page) && Number(page) > 0 ? Number(page) : 1;
}

export async function getPaginatedPublicEvents(filters?: {
  city?: string;
  search?: string;
  page?: number;
}) {
  try {
    const where = publicEventListWhere(new Date(), filters);
    const requestedPage = normalizeRequestedPage(filters?.page);
    const findEventsPage = (page: number) => prisma.evento.findMany({
      where,
      orderBy: publicEventListOrderBy,
      skip: (page - 1) * HOME_EVENTS_PAGE_SIZE,
      take: HOME_EVENTS_PAGE_SIZE,
      select: publicEventCardSelect,
    });
    const firstPageResult = requestedPage === 1
      ? await Promise.all([
          prisma.evento.count({ where }),
          findEventsPage(1),
        ])
      : null;
    const totalCount = firstPageResult?.[0] ?? await prisma.evento.count({ where });
    const totalPages = Math.ceil(totalCount / HOME_EVENTS_PAGE_SIZE);
    const currentPage = normalizePage(filters?.page, totalPages);
    const events = firstPageResult
      ? firstPageResult[1]
      : await findEventsPage(currentPage);

    return { events, totalCount, totalPages, currentPage };
  } catch (error) {
    console.warn("Could not fetch paginated public events:", (error as Error).message);
    return { events: [], totalCount: 0, totalPages: 0, currentPage: 1 };
  }
}

export async function getPaginatedMusicianEvents(filters?: {
  city?: string;
  search?: string;
  page?: number;
}) {
  const user = await requireAuthenticatedUserForRender();
  requireRole(user, "MUSICO");

  const now = new Date();
  const where = publicEventListWhere(now, filters);
  const requestedPage = normalizeRequestedPage(filters?.page);
  const findEventsPage = (page: number) => prisma.evento.findMany({
    where,
    orderBy: publicEventListOrderBy,
    skip: (page - 1) * HOME_EVENTS_PAGE_SIZE,
    take: HOME_EVENTS_PAGE_SIZE,
    select: musicianEventListSelect,
  });
  const findProjects = () => prisma.proyectoMusical.findMany({
    where: { usuarioId: user.id, estaActivo: true },
    orderBy: { creadoEn: "desc" },
    select: { id: true, nombre: true },
  });
  const firstPageResult = requestedPage === 1
    ? await Promise.all([
        prisma.evento.count({ where }),
        findProjects(),
        findEventsPage(1),
      ])
    : null;
  const [totalCount, projects] = firstPageResult
    ? [firstPageResult[0], firstPageResult[1]]
    : await Promise.all([
        prisma.evento.count({ where }),
        findProjects(),
      ]);
  const totalPages = Math.ceil(totalCount / HOME_EVENTS_PAGE_SIZE);
  const currentPage = normalizePage(filters?.page, totalPages);
  const rawEvents = firstPageResult
    ? firstPageResult[2]
    : await findEventsPage(currentPage);
  const eventIds = rawEvents.map((event) => event.id);

  const [postulations, contracts] = eventIds.length > 0
    ? await Promise.all([
        prisma.postulacion.findMany({
          where: { musicoId: user.id, eventoId: { in: eventIds } },
          select: {
            id: true,
            eventoId: true,
            proyectoMusicalId: true,
            estado: true,
          },
        }),
        prisma.contratacion.findMany({
          where: { musicoId: user.id, eventoId: { in: eventIds } },
          select: {
            id: true,
            eventoId: true,
            proyectoMusicalId: true,
            estado: true,
          },
        }),
      ])
    : [[], []];

  const events = rawEvents.map(({ contrataciones, ...event }) => ({
    ...event,
    hasStarted: event.startsAt.getTime() <= now.getTime(),
    confirmedCount: calcularCupos({
      cantidadRequerida: event.cantidadMusicosRequerida,
      contrataciones,
    }).cuposOcupados,
    postulations: postulations.filter((item) => item.eventoId === event.id),
    contracts: contracts.filter((item) => item.eventoId === event.id),
  }));

  return { events, projects, totalCount, totalPages, currentPage };
}
