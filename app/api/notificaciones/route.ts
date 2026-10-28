import { NextRequest } from "next/server";
import {
  apiErrorResponse,
  requireAuthenticatedUser,
} from "@/lib/api-helpers";
import {
  getUserNotifications,
  getUnreadNotificationsCount,
} from "@/lib/notification-access";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 10, 1), 50);

    const [notificaciones, noLeidasCount] = await Promise.all([
      getUserNotifications(user.id, limit),
      getUnreadNotificationsCount(user.id),
    ]);

    return Response.json(
      {
        notificaciones,
        noLeidasCount,
      },
      { status: 200 }
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

