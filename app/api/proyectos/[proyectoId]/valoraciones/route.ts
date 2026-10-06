import {
  apiErrorResponse,
  uuidSchema,
  zodErrorResponse,
} from "@/lib/api-helpers";
import { getPublicProjectReputation } from "@/lib/rating-access";

interface RouteParams {
  params: Promise<{ proyectoId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { proyectoId } = await params;
    const parsedId = uuidSchema.safeParse(proyectoId);
    if (!parsedId.success) return zodErrorResponse(parsedId.error);

    const reputation = await getPublicProjectReputation(parsedId.data);
    return Response.json(reputation, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
