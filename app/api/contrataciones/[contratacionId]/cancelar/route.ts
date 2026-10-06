import { NextRequest } from "next/server";
import {
  apiErrorResponse,
  requireAuthenticatedUser,
  uuidSchema,
  zodErrorResponse,
} from "@/lib/api-helpers";
import { ValidationError } from "@/lib/errors";
import { cancelParticipatingContract } from "@/lib/contract-access";
import { cancelarContratacionBodySchema } from "@/lib/validations/contracts";

interface RouteParams {
  params: Promise<{ contratacionId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuthenticatedUser(request);

    const { contratacionId } = await params;
    const parsedId = uuidSchema.safeParse(contratacionId);
    if (!parsedId.success) return zodErrorResponse(parsedId.error);

    let body: unknown = {};
    const rawBody = await request.text();
    if (rawBody.trim()) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        throw new ValidationError("Cuerpo de solicitud inválido");
      }
    }

    const parsedBody = cancelarContratacionBodySchema.safeParse(body);
    if (!parsedBody.success) return zodErrorResponse(parsedBody.error);

    const contract = await cancelParticipatingContract({
      contractId: parsedId.data,
      userId: user.id,
      cancellationReason: parsedBody.data.motivoCancelacion || null,
    });

    return Response.json(contract, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
