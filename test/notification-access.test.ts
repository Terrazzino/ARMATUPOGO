import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  createMany: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notificacion: {
      create: mocks.create,
      createMany: mocks.createMany,
      findMany: mocks.findMany,
      count: mocks.count,
      updateMany: mocks.updateMany,
    },
  },
}));

import {
  createNotification,
  createManyNotifications,
  getUserNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/notification-access";
import { prisma } from "@/lib/prisma";

describe("lib/notification-access", () => {
  const userId = "11111111-1111-1111-1111-111111111111";
  const notificationId = "22222222-2222-2222-2222-222222222222";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createNotification", () => {
    it("crea una notificación con los datos correctos", async () => {
      mocks.create.mockResolvedValueOnce({
        id: notificationId,
        usuarioId: userId,
        tipo: "POSTULACION_RECIBIDA",
        titulo: "Nueva postulación",
        mensaje: "Mensaje de prueba",
        enlace: "/dashboard/organizer",
        leida: false,
        creadoEn: new Date(),
      });

      const res = await createNotification(prisma, {
        usuarioId: userId,
        tipo: "POSTULACION_RECIBIDA",
        titulo: "Nueva postulación",
        mensaje: "Mensaje de prueba",
        enlace: "/dashboard/organizer",
      });

      expect(mocks.create).toHaveBeenCalledWith({
        data: {
          usuarioId: userId,
          tipo: "POSTULACION_RECIBIDA",
          titulo: "Nueva postulación",
          mensaje: "Mensaje de prueba",
          enlace: "/dashboard/organizer",
        },
      });
      expect(res.id).toBe(notificationId);
    });

    it("asigna enlace null cuando no se proporciona", async () => {
      mocks.create.mockResolvedValueOnce({ id: notificationId });

      await createNotification(prisma, {
        usuarioId: userId,
        tipo: "EVENTO_CANCELADO",
        titulo: "Evento cancelado",
        mensaje: "El evento fue cancelado",
      });

      expect(mocks.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          enlace: null,
        }),
      });
    });
  });

  describe("createManyNotifications", () => {
    it("devuelve { count: 0 } sin llamar a la base si la lista está vacía", async () => {
      const res = await createManyNotifications(prisma, []);
      expect(res).toEqual({ count: 0 });
      expect(mocks.createMany).not.toHaveBeenCalled();
    });

    it("inserta múltiples notificaciones en batch", async () => {
      mocks.createMany.mockResolvedValueOnce({ count: 2 });

      const res = await createManyNotifications(prisma, [
        {
          usuarioId: "user-1",
          tipo: "EVENTO_CANCELADO",
          titulo: "Evento cancelado",
          mensaje: "Cancelado",
          enlace: "/dashboard/musician",
        },
        {
          usuarioId: "user-2",
          tipo: "EVENTO_CANCELADO",
          titulo: "Evento cancelado",
          mensaje: "Cancelado",
          enlace: "/dashboard/musician",
        },
      ]);

      expect(mocks.createMany).toHaveBeenCalledWith({
        data: [
          {
            usuarioId: "user-1",
            tipo: "EVENTO_CANCELADO",
            titulo: "Evento cancelado",
            mensaje: "Cancelado",
            enlace: "/dashboard/musician",
          },
          {
            usuarioId: "user-2",
            tipo: "EVENTO_CANCELADO",
            titulo: "Evento cancelado",
            mensaje: "Cancelado",
            enlace: "/dashboard/musician",
          },
        ],
      });
      expect(res.count).toBe(2);
    });
  });

  describe("getUserNotifications", () => {
    it("consulta únicamente las notificaciones del usuario con el límite y orden descendente", async () => {
      const mockList = [
        {
          id: notificationId,
          tipo: "OFERTA_RECIBIDA",
          titulo: "Oferta",
          mensaje: "Detalles",
          enlace: "/dashboard/musician",
          leida: false,
          creadoEn: new Date(),
        },
      ];
      mocks.findMany.mockResolvedValueOnce(mockList);

      const result = await getUserNotifications(userId, 5);

      expect(mocks.findMany).toHaveBeenCalledWith({
        where: { usuarioId: userId },
        orderBy: { creadoEn: "desc" },
        take: 5,
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
      expect(result).toEqual(mockList);
    });

    it("utiliza 10 como límite por defecto", async () => {
      mocks.findMany.mockResolvedValueOnce([]);
      await getUserNotifications(userId);
      expect(mocks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      );
    });
  });

  describe("getUnreadNotificationsCount", () => {
    it("cuenta solo las notificaciones leida = false del usuario", async () => {
      mocks.count.mockResolvedValueOnce(3);

      const count = await getUnreadNotificationsCount(userId);

      expect(mocks.count).toHaveBeenCalledWith({
        where: {
          usuarioId: userId,
          leida: false,
        },
      });
      expect(count).toBe(3);
    });
  });

  describe("markNotificationAsRead", () => {
    it("actualiza la notificación cuando coincide con el usuario propietario", async () => {
      mocks.updateMany.mockResolvedValueOnce({ count: 1 });

      const result = await markNotificationAsRead(notificationId, userId);

      expect(mocks.updateMany).toHaveBeenCalledWith({
        where: {
          id: notificationId,
          usuarioId: userId,
        },
        data: {
          leida: true,
        },
      });
      expect(result).toEqual({ updated: true });
    });

    it("devuelve { updated: false } si la notificación pertenece a otro usuario o no existe", async () => {
      mocks.updateMany.mockResolvedValueOnce({ count: 0 });

      const result = await markNotificationAsRead(notificationId, "otro-usuario");

      expect(result).toEqual({ updated: false });
    });
  });

  describe("markAllNotificationsAsRead", () => {
    it("marca todas las notificaciones no leídas del usuario como leídas", async () => {
      mocks.updateMany.mockResolvedValueOnce({ count: 4 });

      const result = await markAllNotificationsAsRead(userId);

      expect(mocks.updateMany).toHaveBeenCalledWith({
        where: {
          usuarioId: userId,
          leida: false,
        },
        data: {
          leida: true,
        },
      });
      expect(result).toEqual({ updatedCount: 4 });
    });
  });
});

