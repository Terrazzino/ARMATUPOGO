import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  apiErrorResponse,
  requireAuthenticatedUser,
  zodErrorResponse,
} from "@/lib/api-helpers";
import { requireRole } from "@/lib/authorization";
import { ValidationError } from "@/lib/errors";
import {
  contractListInclude,
  contractsForUserWhere,
  createDirectContract,
} from "@/lib/contract-access";
import { crearContratacionSchema } from "@/lib/validations/contracts";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);

    const contracts = await prisma.contratacion.findMany({
      where: contractsForUserWhere(user.rol, user.id),
      orderBy: { actualizadoEn: "desc" },
      include: contractListInclude,
    });

    return Response.json(contracts, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);
    requireRole(user, "ORGANIZADOR");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("Cuerpo de solicitud inválido");
    }

    const parsed = crearContratacionSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const contract = await createDirectContract({
      eventId: parsed.data.eventoId,
      projectId: parsed.data.proyectoMusicalId,
      organizerId: user.id,
      initialOfferAmount: parsed.data.initialOfferAmount,
      initialMessage: parsed.data.initialMessage,
    });

    return Response.json(contract, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
