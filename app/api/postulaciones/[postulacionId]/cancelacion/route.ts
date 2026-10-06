import { NextRequest } from "next/server";
import {
  apiErrorResponse,
  requireAuthenticatedUser,
  uuidSchema,
  zodErrorResponse,
} from "@/lib/api-helpers";
import { requireRole } from "@/lib/authorization";
import { cancelOwnedPostulation } from "@/lib/postulation-access";

interface RouteParams {
  params: Promise<{ postulacionId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuthenticatedUser(request);
    requireRole(user, "MUSICO");

    const { postulacionId } = await params;
    const parsedId = uuidSchema.safeParse(postulacionId);
    if (!parsedId.success) return zodErrorResponse(parsedId.error);

    const postulation = await cancelOwnedPostulation(parsedId.data, user.id);
    return Response.json(postulation, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
