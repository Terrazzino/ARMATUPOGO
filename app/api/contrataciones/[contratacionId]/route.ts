import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  apiErrorResponse,
  requireAuthenticatedUser,
  uuidSchema,
  zodErrorResponse,
} from "@/lib/api-helpers";
import { participatingContractWhere } from "@/lib/authorization";
import { contractDetailInclude } from "@/lib/contract-access";
import { NotFoundError } from "@/lib/errors";

interface RouteParams {
  params: Promise<{ contratacionId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuthenticatedUser(request);

    const { contratacionId } = await params;
    const parsedId = uuidSchema.safeParse(contratacionId);
    if (!parsedId.success) return zodErrorResponse(parsedId.error);

    const contract = await prisma.contratacion.findFirst({
      where: participatingContractWhere(parsedId.data, user.id),
      include: contractDetailInclude,
    });
    if (!contract) throw new NotFoundError("Contratación");

    return Response.json(contract, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
