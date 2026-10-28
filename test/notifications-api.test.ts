import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  getUserNotifications: vi.fn(),
  getUnreadNotificationsCount: vi.fn(),
  markNotificationAsRead: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/api-helpers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api-helpers")>()),
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

vi.mock("@/lib/notification-access", () => ({
  getUserNotifications: mocks.getUserNotifications,
  getUnreadNotificationsCount: mocks.getUnreadNotificationsCount,
  markNotificationAsRead: mocks.markNotificationAsRead,
  markAllNotificationsAsRead: mocks.markAllNotificationsAsRead,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

import { AuthenticationError } from "@/lib/errors";
import { GET as getNotifications } from "@/app/api/notificaciones/route";
import { PATCH as patchNotification } from "@/app/api/notificaciones/[id]/route";
import { POST as postMarkAll } from "@/app/api/notificaciones/marcar-todas/route";
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "@/app/actions/notifications";

describe("API y Server Actions de Notificaciones", () => {
  const userId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  const notificationId = "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";
  const mockUser = { id: userId, rol: "MUSICO" as const };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUser.mockResolvedValue(mockUser);
  });

  describe("GET /api/notificaciones", () => {
    it("devuelve 401 si el usuario no está autenticado", async () => {
      mocks.requireAuthenticatedUser.mockRejectedValueOnce(
        new AuthenticationError("No autenticado")
      );

      const req = new NextRequest("http://localhost/api/notificaciones");
      const res = await getNotifications(req);

      expect(res.status).toBe(401);
    });

    it("devuelve la lista de notificaciones y el conteo de no leídas", async () => {
      const mockList = [
        {
          id: notificationId,
          tipo: "INVITACION_RECIBIDA",
          titulo: "Invitación",
          mensaje: "Tocá con nosotros",
          enlace: "/dashboard/musician",
          leida: false,
          creadoEn: new Date(),
        },
      ];
      mocks.getUserNotifications.mockResolvedValueOnce(mockList);
      mocks.getUnreadNotificationsCount.mockResolvedValueOnce(1);

      const req = new NextRequest("http://localhost/api/notificaciones?limit=5");
      const res = await getNotifications(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(mocks.getUserNotifications).toHaveBeenCalledWith(userId, 5);
      expect(mocks.getUnreadNotificationsCount).toHaveBeenCalledWith(userId);
      expect(json.noLeidasCount).toBe(1);
      expect(json.notificaciones).toHaveLength(1);
    });
  });

  describe("PATCH /api/notificaciones/[id]", () => {
    it("devuelve 400 si el ID no es un UUID válido", async () => {
      const req = new NextRequest("http://localhost/api/notificaciones/invalido", {
        method: "PATCH",
      });
      const res = await patchNotification(req, {
        params: Promise.resolve({ id: "no-es-uuid" }),
      });

      expect(res.status).toBe(400);
    });

    it("marca la notificación como leída", async () => {
      mocks.markNotificationAsRead.mockResolvedValueOnce({ updated: true });

      const req = new NextRequest(
        `http://localhost/api/notificaciones/${notificationId}`,
        { method: "PATCH" }
      );
      const res = await patchNotification(req, {
        params: Promise.resolve({ id: notificationId }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(mocks.markNotificationAsRead).toHaveBeenCalledWith(
        notificationId,
        userId
      );
      expect(json).toEqual({ updated: true });
    });
  });

  describe("POST /api/notificaciones/marcar-todas", () => {
    it("marca todas las notificaciones como leídas para el usuario autenticado", async () => {
      mocks.markAllNotificationsAsRead.mockResolvedValueOnce({ updatedCount: 3 });

      const req = new NextRequest(
        "http://localhost/api/notificaciones/marcar-todas",
        { method: "POST" }
      );
      const res = await postMarkAll(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(mocks.markAllNotificationsAsRead).toHaveBeenCalledWith(userId);
      expect(json).toEqual({ updatedCount: 3 });
    });
  });

  describe("Server Actions (app/actions/notifications.ts)", () => {
    it("getMyNotifications devuelve lista correctamente", async () => {
      mocks.getUserNotifications.mockResolvedValueOnce([{ id: notificationId }]);

      const result = await getMyNotifications(5);

      expect(result).toEqual({
        success: true,
        data: [{ id: notificationId }],
      });
    });

    it("getUnreadCount devuelve conteo correctamente", async () => {
      mocks.getUnreadNotificationsCount.mockResolvedValueOnce(4);

      const result = await getUnreadCount();

      expect(result).toEqual({
        success: true,
        count: 4,
      });
    });

    it("markAsRead valida UUID y revalida paths", async () => {
      mocks.markNotificationAsRead.mockResolvedValueOnce({ updated: true });

      const result = await markAsRead(notificationId);

      expect(result).toEqual({ success: true, updated: true });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/musician");
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/organizer");
    });

    it("markAsRead falla con ValidationError si el ID es inválido", async () => {
      const result = await markAsRead("invalido");

      expect(result).toEqual({
        error: true,
        message: expect.stringContaining("ID de notificación inválido"),
      });
    });

    it("markAllAsRead marca todo y revalida paths", async () => {
      mocks.markAllNotificationsAsRead.mockResolvedValueOnce({ updatedCount: 2 });

      const result = await markAllAsRead();

      expect(result).toEqual({ success: true, updatedCount: 2 });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/musician");
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/organizer");
    });
  });
});
