import { prisma } from "@/lib/prisma";
import type { Prisma, TipoNotificacion } from "@prisma/client";

export interface CreateNotificationInput {
  usuarioId: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  enlace?: string | null;
}

export type DbClient = Prisma.TransactionClient | typeof prisma;

/**
 * Crea una notificación atómica dentro de una transacción o cliente Prisma.
 */
export async function createNotification(
  client: DbClient,
  input: CreateNotificationInput
) {
  return client.notificacion.create({
    data: {
      usuarioId: input.usuarioId,
      tipo: input.tipo,
      titulo: input.titulo,
      mensaje: input.mensaje,
      enlace: input.enlace ?? null,
    },
  });
}

/**
 * Crea múltiples notificaciones en batch dentro de una transacción o cliente.
 */
export async function createManyNotifications(
  client: DbClient,
  inputs: CreateNotificationInput[]
) {
  if (inputs.length === 0) return { count: 0 };
  return client.notificacion.createMany({
    data: inputs.map((input) => ({
      usuarioId: input.usuarioId,
      tipo: input.tipo,
      titulo: input.titulo,
      mensaje: input.mensaje,
      enlace: input.enlace ?? null,
    })),
  });
}

/**
 * Obtiene las últimas notificaciones del usuario autenticado.
 */
export async function getUserNotifications(userId: string, limit = 10) {
  return prisma.notificacion.findMany({
    where: { usuarioId: userId },
    orderBy: { creadoEn: "desc" },
    take: limit,
    select: {
      id: true,
      tipo: true,
      titulo: true,
      mensaje: true,
      enlace: true,
      leida: true,
      creadoEn: true,
    },
  });
}

/**
 * Obtiene la cantidad de notificaciones no leídas del usuario autenticado.
 */
export async function getUnreadNotificationsCount(userId: string) {
  return prisma.notificacion.count({
    where: {
      usuarioId: userId,
      leida: false,
    },
  });
}

/**
 * Marca una notificación individual como leída garantizando ownership estricto.
 * Si no existe o pertenece a otro usuario, no falla ni revela existencia.
 */
export async function markNotificationAsRead(notificationId: string, userId: string) {
  const result = await prisma.notificacion.updateMany({
    where: {
      id: notificationId,
      usuarioId: userId,
    },
    data: {
      leida: true,
    },
  });
  return { updated: result.count > 0 };
}

/**
 * Marca todas las notificaciones no leídas del usuario como leídas.
 */
export async function markAllNotificationsAsRead(userId: string) {
  const result = await prisma.notificacion.updateMany({
    where: {
      usuarioId: userId,
      leida: false,
    },
    data: {
      leida: true,
    },
  });
  return { updatedCount: result.count };
}

