import {
  apiErrorResponse,
  uuidSchema,
  zodErrorResponse,
} from "@/lib/api-helpers";
import { getPublicUserReputation } from "@/lib/rating-access";

interface RouteParams {
  params: Promise<{ usuarioId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { usuarioId } = await params;
    const parsedId = uuidSchema.safeParse(usuarioId);
    if (!parsedId.success) return zodErrorResponse(parsedId.error);

    const reputation = await getPublicUserReputation(parsedId.data);
    return Response.json(reputation, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
