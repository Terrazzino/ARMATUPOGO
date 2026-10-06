import { NextRequest } from "next/server";
import {
  apiErrorResponse,
  requireAuthenticatedUser,
  uuidSchema,
  zodErrorResponse,
} from "@/lib/api-helpers";
import { requireRole } from "@/lib/authorization";
import { acceptOwnedPostulation } from "@/lib/postulation-access";

interface RouteParams {
  params: Promise<{ postulacionId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuthenticatedUser(request);
    requireRole(user, "ORGANIZADOR");

    const { postulacionId } = await params;
    const parsedId = uuidSchema.safeParse(postulacionId);
    if (!parsedId.success) return zodErrorResponse(parsedId.error);

    const { updatedPostulation, contract } = await acceptOwnedPostulation(
      parsedId.data,
      user.id
    );

    return Response.json(
      { postulacion: updatedPostulation, contratacion: contract },
      { status: 200 }
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
