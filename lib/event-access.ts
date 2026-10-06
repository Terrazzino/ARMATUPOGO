import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { ownedEventWhere } from "@/lib/authorization";
import { validarModificacionFechasEvento } from "@/lib/contrataciones";
import { validarReduccionCupos } from "@/lib/cupos";
import type { EventoInput } from "@/lib/validations/events";

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
      id: true,
      proyectoMusical: {
        select: { id: true, nombre: true, genero: true, imagenUrl: true },
      },
    },
  },
} satisfies Prisma.EventoSelect;

export const publicEventDetailSelect = {
  ...publicEventListSelect,
  contrataciones: {
    where: { estado: "ACORDADO" as const },
    select: {
      id: true,
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
    ];
  }

  return where;
}

export function eventCreateData(
  organizerId: string,
  data: EventoInput
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
  };
}

export function eventUpdateData(
  data: Partial<EventoInput>
): Prisma.EventoUpdateInput {
  return {
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
        motivoCancelacion: "Cancelación del evento por el organizador",
      },
    });

    return updated;
  });
}
