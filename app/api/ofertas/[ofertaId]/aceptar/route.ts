import { NextRequest } from "next/server";
import {
  apiErrorResponse,
  requireAuthenticatedUser,
  uuidSchema,
  zodErrorResponse,
} from "@/lib/api-helpers";
import { acceptOfferAsCounterparty } from "@/lib/offer-access";

interface RouteParams {
  params: Promise<{ ofertaId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuthenticatedUser(request);

    const { ofertaId } = await params;
    const parsedId = uuidSchema.safeParse(ofertaId);
    if (!parsedId.success) return zodErrorResponse(parsedId.error);

    const { updatedOffer, updatedContract } = await acceptOfferAsCounterparty(
      parsedId.data,
      user.id
    );

    return Response.json(
      { offer: updatedOffer, contract: updatedContract },
      { status: 200 }
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
