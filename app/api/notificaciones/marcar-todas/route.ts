import { NextRequest } from "next/server";
import {
  apiErrorResponse,
  requireAuthenticatedUser,
} from "@/lib/api-helpers";
import { markAllNotificationsAsRead } from "@/lib/notification-access";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);
    const result = await markAllNotificationsAsRead(user.id);
    return Response.json(result, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

