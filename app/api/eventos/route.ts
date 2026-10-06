import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  apiErrorResponse,
  requireAuthenticatedUser,
  zodErrorResponse,
} from "@/lib/api-helpers";
import { requireRole } from "@/lib/authorization";
import { ValidationError } from "@/lib/errors";
import { eventoSchema } from "@/lib/validations/events";
import {
  eventCreateData,
  privateEventInclude,
  validateEventDates,
} from "@/lib/event-access";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);
    requireRole(user, "ORGANIZADOR");

    const events = await prisma.evento.findMany({
      where: { organizadorId: user.id },
      orderBy: { startsAt: "asc" },
      include: privateEventInclude,
    });

    return Response.json(events, { status: 200 });
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

    const parsed = eventoSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    validateEventDates(parsed.data);

    const event = await prisma.evento.create({
      data: eventCreateData(user.id, parsed.data),
    });

    return Response.json(event, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
