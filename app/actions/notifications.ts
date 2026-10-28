/**
 * Server Actions para Notificaciones.
 *
 * @see docs/spec.md
 * @see AGENTS.md § 7. ARQUITECTURA & § 10. AUTORIZACIÓN
 */

"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticatedUser, uuidSchema } from "@/lib/api-helpers";
import { normalizeError, ValidationError } from "@/lib/errors";
import {
  getUserNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/notification-access";

export async function getMyNotifications(limit = 10) {
  try {
    const user = await requireAuthenticatedUser();
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
    const notifications = await getUserNotifications(user.id, safeLimit);
    return { success: true, data: notifications };
  } catch (error) {
    const normalized = normalizeError(error);
    return { error: true, message: normalized.message };
  }
}

export async function getUnreadCount() {
  try {
    const user = await requireAuthenticatedUser();
    const count = await getUnreadNotificationsCount(user.id);
    return { success: true, count };
  } catch (error) {
    const normalized = normalizeError(error);
    return { error: true, message: normalized.message, count: 0 };
  }
}

export async function markAsRead(notificationId: string) {
  try {
    const user = await requireAuthenticatedUser();
    const parsedId = uuidSchema.safeParse(notificationId);
    if (!parsedId.success) {
      throw new ValidationError("ID de notificación inválido");
    }

    const result = await markNotificationAsRead(parsedId.data, user.id);
    revalidatePath("/dashboard/musician");
    revalidatePath("/dashboard/organizer");
    return { success: true, ...result };
  } catch (error) {
    const normalized = normalizeError(error);
    return { error: true, message: normalized.message };
  }
}

export async function markAllAsRead() {
  try {
    const user = await requireAuthenticatedUser();
    const result = await markAllNotificationsAsRead(user.id);
    revalidatePath("/dashboard/musician");
    revalidatePath("/dashboard/organizer");
    return { success: true, ...result };
  } catch (error) {
    const normalized = normalizeError(error);
    return { error: true, message: normalized.message };
  }
}

