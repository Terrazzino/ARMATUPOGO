import { NextRequest } from "next/server";
import {
  apiErrorResponse,
  requireAuthenticatedUser,
  uuidSchema,
  zodErrorResponse,
} from "@/lib/api-helpers";
import { markNotificationAsRead } from "@/lib/notification-access";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuthenticatedUser(request);
    const { id } = await params;
    const parsedId = uuidSchema.safeParse(id);
    if (!parsedId.success) return zodErrorResponse(parsedId.error);

    const result = await markNotificationAsRead(parsedId.data, user.id);
    return Response.json(result, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

