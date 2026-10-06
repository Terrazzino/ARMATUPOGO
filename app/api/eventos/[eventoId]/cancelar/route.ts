import { NextRequest } from "next/server";
import {
  apiErrorResponse,
  requireAuthenticatedUser,
  uuidSchema,
  zodErrorResponse,
} from "@/lib/api-helpers";
import { requireRole } from "@/lib/authorization";
import { cancelOwnedEvent } from "@/lib/event-access";

interface RouteParams {
  params: Promise<{ eventoId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuthenticatedUser(request);
    requireRole(user, "ORGANIZADOR");

    const { eventoId } = await params;
    const parsedId = uuidSchema.safeParse(eventoId);
    if (!parsedId.success) return zodErrorResponse(parsedId.error);

    const cancelledEvent = await cancelOwnedEvent(parsedId.data, user.id);
    return Response.json(cancelledEvent, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
