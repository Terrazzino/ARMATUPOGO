import { NextRequest } from "next/server";
import {
  apiErrorResponse,
  requireAuthenticatedUser,
  uuidSchema,
  zodErrorResponse,
} from "@/lib/api-helpers";
import { completeParticipatingContract } from "@/lib/contract-access";

interface RouteParams {
  params: Promise<{ contratacionId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuthenticatedUser(request);

    const { contratacionId } = await params;
    const parsedId = uuidSchema.safeParse(contratacionId);
    if (!parsedId.success) return zodErrorResponse(parsedId.error);

    const contract = await completeParticipatingContract(parsedId.data, user.id);
    return Response.json(contract, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
