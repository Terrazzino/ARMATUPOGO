import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { createManyNotifications } from "@/lib/notification-access";
import { ownedEventWhere } from "@/lib/authorization";
import { validarModificacionFechasEvento } from "@/lib/contrataciones";
import { validarReduccionCupos } from "@/lib/cupos";
import { EVENT_CANCELLATION_BY_ORGANIZER_REASON } from "@/lib/constants";
import type { EventoCreateInput, EventoInput, EventoUpdateInput } from "@/lib/validations/events";

/** Tipo de la única Entrada que gestiona la UI MVP (el modelo admite varias). */
export const GENERAL_TICKET_TYPE = "GENERAL";

/** Entrada GENERAL más antigua del evento: la que edita el organizador. */
export const generalTicketArgs = {
  where: { tipoEntrada: GENERAL_TICKET_TYPE },
  orderBy: { creadoEn: "asc" as const },
  take: 1,
  select: { id: true, precio: true, esGratuita: true },
} satisfies Prisma.Evento$entradasArgs;

export const privateEventInclude = {
  contrataciones: {
    select: {
      id: true,
      estado: true,
      montoPactado: true,
      proyectoMusical: {
        select: { id: true, nombre: true, genero: true },
      },
    },
  },
  entradas: generalTicketArgs,
} satisfies Prisma.EventoInclude;

export const publicEventListSelect = {
  id: true,
  titulo: true,
  descripcion: true,
  startsAt: true,
  endsAt: true,
  ubicacion: true,
  nombreLugar: true,
  ciudad: true,
  cantidadMusicosRequerida: true,
  cacheOfrecido: true,
  estado: true,
  bannerUrl: true,
  organizador: {
    select: { id: true, nombre: true, apellido: true, fotoPerfilUrl: true },
  },
  contrataciones: {
    where: { estado: "ACORDADO" as const },
    select: {
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
          enlacesPersonalizados: true,
        },
      },
    },
  },
  entradas: {
    orderBy: { precio: "asc" as const },
    select: {
      precio: true,
      esGratuita: true,
    },
  },
} satisfies Prisma.EventoSelect;

/** Proyección mínima utilizada exclusivamente por las tarjetas públicas. */
export const publicEventCardSelect = {
  id: true,
  titulo: true,
  startsAt: true,
  ubicacion: true,
  nombreLugar: true,
  ciudad: true,
  bannerUrl: true,
  contrataciones: {
    where: { estado: "ACORDADO" as const },
    select: {
      proyectoMusical: {
        select: {
          id: true,
          nombre: true,
          genero: true,
          spotifyUrl: true,
          youtubeUrl: true,
          instagramUrl: true,
          sitioWebUrl: true,
          enlacesPersonalizados: true,
        },
      },
    },
  },
  entradas: {
    orderBy: { precio: "asc" as const },
    select: {
      precio: true,
      esGratuita: true,
    },
  },
} satisfies Prisma.EventoSelect;

export const publicEventListOrderBy = [
  { startsAt: "asc" as const },
  { id: "asc" as const },
] satisfies Prisma.EventoOrderByWithRelationInput[];

export const musicianEventListSelect = {
  id: true,
  titulo: true,
  startsAt: true,
  endsAt: true,
  ubicacion: true,
  nombreLugar: true,
  ciudad: true,
  cantidadMusicosRequerida: true,
  cacheOfrecido: true,
  bannerUrl: true,
  contrataciones: {
    select: { estado: true },
  },
} satisfies Prisma.EventoSelect;

export const publicEventDetailSelect = {
  ...publicEventListSelect,
  contrataciones: {
    where: { estado: { in: ["ACORDADO" as const, "COMPLETADO" as const] } },
    select: {
      estado: true,
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
  entradas: {
    select: {
      id: true,
      tipoEntrada: true,
      precio: true,
      capacidad: true,
      descripcion: true,
      urlCompraExterna: true,
      esGratuita: true,
    },
  },
} satisfies Prisma.EventoSelect;

export function publicEventListWhere(
  now: Date,
  filters?: { city?: string | null; search?: string | null }
): Prisma.EventoWhereInput {
  const where: Prisma.EventoWhereInput = {
    estado: "PUBLICADO",
    endsAt: { gt: now },
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
      {
        contrataciones: {
          some: {
            estado: "ACORDADO",
            proyectoMusical: {
              nombre: { contains: filters.search, mode: "insensitive" },
            },
          },
        },
      },
    ];
  }

  return where;
}

/** `esGratuita` se deriva siempre del precio: la fuente de verdad es `precio`. */
function generalTicketData(precio: number) {
  return { tipoEntrada: GENERAL_TICKET_TYPE, precio, esGratuita: precio === 0 };
}

/**
 * Crea el Evento y su única Entrada GENERAL en una sola escritura anidada de Prisma,
 * por lo que es atómica: si falla la Entrada no queda un Evento huérfano.
 */
export function eventCreateData(
  organizerId: string,
  data: EventoCreateInput
): Prisma.EventoUncheckedCreateInput {
  return {
    organizadorId: organizerId,
    titulo: data.titulo,
    descripcion: data.descripcion || null,
    startsAt: new Date(data.startsAt),
    endsAt: new Date(data.endsAt),
    ubicacion: data.ubicacion,
    nombreLugar: data.nombreLugar || null,
    ciudad: data.ciudad || null,
    cantidadMusicosRequerida: data.cantidadMusicosRequerida,
    cacheOfrecido: data.cacheOfrecido ?? null,
    estado: "PUBLICADO",
    bannerUrl: data.bannerUrl || null,
    entradas: { create: generalTicketData(data.precioEntrada) },
  };
}

/**
 * `existingGeneralTicketId` es la Entrada GENERAL ya cargada del evento propio.
 * Si existe se actualiza; si es un evento histórico sin Entrada se crea. Ambos casos
 * viajan dentro del mismo `evento.update`, cuyo `where` ya filtra por organizador.
 */
export function eventUpdateData(
  data: Partial<EventoUpdateInput>,
  existingGeneralTicketId?: string | null
): Prisma.EventoUpdateInput {
  return {
    ...(data.precioEntrada !== undefined && {
      entradas: existingGeneralTicketId
        ? { update: { where: { id: existingGeneralTicketId }, data: generalTicketData(data.precioEntrada) } }
        : { create: generalTicketData(data.precioEntrada) },
    }),
    ...(data.titulo !== undefined && { titulo: data.titulo }),
    ...(data.descripcion !== undefined && { descripcion: data.descripcion || null }),
    ...(data.startsAt !== undefined && { startsAt: new Date(data.startsAt) }),
    ...(data.endsAt !== undefined && { endsAt: new Date(data.endsAt) }),
    ...(data.ubicacion !== undefined && { ubicacion: data.ubicacion }),
    ...(data.nombreLugar !== undefined && { nombreLugar: data.nombreLugar || null }),
    ...(data.ciudad !== undefined && { ciudad: data.ciudad || null }),
    ...(data.cantidadMusicosRequerida !== undefined && {
      cantidadMusicosRequerida: data.cantidadMusicosRequerida,
    }),
    ...(data.cacheOfrecido !== undefined && { cacheOfrecido: data.cacheOfrecido ?? null }),
    ...(data.bannerUrl !== undefined && { bannerUrl: data.bannerUrl || null }),
  };
}

export function validateEventDates(data: Pick<EventoInput, "startsAt" | "endsAt">) {
  if (new Date(data.endsAt).getTime() <= new Date(data.startsAt).getTime()) {
    throw new ValidationError("La fecha de finalización debe ser posterior a la de inicio");
  }
}

export function validateEventUpdate(
  existing: {
    startsAt: Date;
    endsAt: Date;
    contrataciones: Array<{ estado: "NEGOCIANDO" | "ACORDADO" | "CANCELADO" | "COMPLETADO" }>;
  },
  data: Partial<EventoInput>
) {
  if (data.startsAt !== undefined || data.endsAt !== undefined) {
    if (!validarModificacionFechasEvento({ contrataciones: existing.contrataciones }).ok) {
      throw new ConflictError("No se pueden modificar las fechas con contrataciones activas");
    }

    validateEventDates({
      startsAt: data.startsAt ?? existing.startsAt.toISOString(),
      endsAt: data.endsAt ?? existing.endsAt.toISOString(),
    });
  }

  if (data.cantidadMusicosRequerida !== undefined) {
    if (
      !validarReduccionCupos({
        nuevaCantidadRequerida: data.cantidadMusicosRequerida,
        contrataciones: existing.contrataciones,
      }).ok
    ) {
      throw new ConflictError("No se pueden reducir los cupos por debajo de los ya acordados");
    }
  }
}

const MAX_SERIALIZABLE_RETRIES = 2;

/**
 * Actualiza un evento propio en una transacción Serializable con retry P2034.
 * Cuando se edita el precio de un evento histórico que aún no tenía Entrada,
 * la transacción Serializable garantiza que ejecuciones concurrentes no creen
 * múltiples entradas GENERAL duplicadas.
 */
export async function updateOwnedEvent(
  eventId: string,
  organizerId: string,
  data: Partial<EventoUpdateInput>,
  options?: {
    bannerUrl?: string | null;
  }
) {
  for (let attempt = 0; attempt <= MAX_SERIALIZABLE_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const existing = await tx.evento.findFirst({
            where: ownedEventWhere(eventId, organizerId),
            include: {
              contrataciones: { select: { estado: true } },
              entradas: generalTicketArgs,
            },
          });
          if (!existing) throw new NotFoundError("Evento");

          validateEventUpdate(existing, data);

          const existingGeneralTicketId = existing.entradas?.[0]?.id;

          return await tx.evento.update({
            where: { id: eventId, organizadorId: organizerId },
            data: {
              ...eventUpdateData(data, existingGeneralTicketId),
              ...(options && options.bannerUrl !== undefined && { bannerUrl: options.bannerUrl }),
            },
          });
        },
        { isolationLevel: "Serializable" }
      );
    } catch (error) {
      const isSerializableConflict =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";

      if (isSerializableConflict && attempt < MAX_SERIALIZABLE_RETRIES) {
        continue;
      }
      if (isSerializableConflict) {
        throw new ConflictError(
          "La operación no pudo completarse debido a un conflicto de concurrencia. Por favor, reintenta."
        );
      }
      throw error;
    }
  }

  throw new ConflictError(
    "La operación no pudo completarse debido a un conflicto de concurrencia. Por favor, reintenta."
  );
}

export async function cancelOwnedEvent(eventId: string, organizerId: string) {
  const existing = await prisma.evento.findFirst({
    where: ownedEventWhere(eventId, organizerId),
  });

  if (!existing) throw new NotFoundError("Evento");
  if (existing.estado === "CANCELADO") {
    throw new ConflictError("El evento ya está cancelado");
  }

  const now = new Date();
  if (now.getTime() >= existing.startsAt.getTime()) {
    throw new ConflictError("No se puede cancelar un evento que ya comenzó");
  }

  return prisma.$transaction(async (tx) => {
    const activeContracts = await tx.contratacion.findMany({
      where: {
        eventoId: eventId,
        estado: { in: ["NEGOCIANDO", "ACORDADO"] },
      },
      select: { musicoId: true },
    });
    const affectedMusicianIds = [...new Set(activeContracts.map((c) => c.musicoId))].filter(
      (id) => id !== organizerId
    );

    const updated = await tx.evento.update({
      where: { id: eventId, organizadorId: organizerId },
      data: { estado: "CANCELADO" },
    });

    await tx.postulacion.updateMany({
      where: { eventoId: eventId, estado: "PENDIENTE" },
      data: { estado: "CANCELADA" },
    });

    await tx.contratacion.updateMany({
      where: {
        eventoId: eventId,
        estado: { in: ["NEGOCIANDO", "ACORDADO"] },
      },
      data: {
        estado: "CANCELADO",
        fechaCancelacion: now,
        motivoCancelacion: EVENT_CANCELLATION_BY_ORGANIZER_REASON,
      },
    });

    if (affectedMusicianIds.length > 0) {
      await createManyNotifications(
        tx,
        affectedMusicianIds.map((musicoId) => ({
          usuarioId: musicoId,
          tipo: "EVENTO_CANCELADO",
          titulo: "Evento cancelado",
          mensaje: `El evento "${existing.titulo}" fue cancelado por el organizador.`,
          enlace: "/dashboard/musician",
        }))
      );
    }

    return updated;
  });
}
