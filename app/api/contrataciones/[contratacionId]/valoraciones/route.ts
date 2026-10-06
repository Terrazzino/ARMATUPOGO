import { NextRequest } from "next/server";
import {
  apiErrorResponse,
  requireAuthenticatedUser,
  uuidSchema,
  zodErrorResponse,
} from "@/lib/api-helpers";
import { ValidationError } from "@/lib/errors";
import {
  createRatingForParticipant,
  getRatingsForParticipant,
} from "@/lib/rating-access";
import { crearValoracionBodySchema } from "@/lib/validations/ratings";

interface RouteParams {
  params: Promise<{ contratacionId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuthenticatedUser(request);
    const { contratacionId } = await params;
    const parsedId = uuidSchema.safeParse(contratacionId);
    if (!parsedId.success) return zodErrorResponse(parsedId.error);

    const ratings = await getRatingsForParticipant(parsedId.data, user.id);
    return Response.json(ratings, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuthenticatedUser(request);
    const { contratacionId } = await params;
    const parsedContractId = uuidSchema.safeParse(contratacionId);
    if (!parsedContractId.success) {
      return zodErrorResponse(parsedContractId.error);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("Cuerpo de solicitud inválido");
    }

    const parsedBody = crearValoracionBodySchema.safeParse(body);
    if (!parsedBody.success) return zodErrorResponse(parsedBody.error);

    const rating = await createRatingForParticipant({
      contractId: parsedContractId.data,
      userId: user.id,
      score: parsedBody.data.puntaje,
      comment: parsedBody.data.comentario,
    });

    return Response.json(rating, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
