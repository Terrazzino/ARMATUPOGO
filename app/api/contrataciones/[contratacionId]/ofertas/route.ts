import { NextRequest } from "next/server";
import {
  apiErrorResponse,
  requireAuthenticatedUser,
  uuidSchema,
  zodErrorResponse,
} from "@/lib/api-helpers";
import { ValidationError } from "@/lib/errors";
import {
  createOfferForParticipant,
  getOffersForParticipant,
} from "@/lib/offer-access";
import { crearOfertaBodySchema } from "@/lib/validations/offers";

interface RouteParams {
  params: Promise<{ contratacionId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuthenticatedUser(request);

    const { contratacionId } = await params;
    const parsedId = uuidSchema.safeParse(contratacionId);
    if (!parsedId.success) return zodErrorResponse(parsedId.error);

    const offers = await getOffersForParticipant(parsedId.data, user.id);
    return Response.json(offers, { status: 200 });
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

    const parsedBody = crearOfertaBodySchema.safeParse(body);
    if (!parsedBody.success) return zodErrorResponse(parsedBody.error);

    const offer = await createOfferForParticipant({
      contractId: parsedContractId.data,
      userId: user.id,
      amount: parsedBody.data.monto,
      message: parsedBody.data.mensaje,
    });

    return Response.json(offer, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
