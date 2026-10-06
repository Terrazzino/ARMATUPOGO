import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  apiErrorResponse,
  requireAuthenticatedUser,
  uuidSchema,
  zodErrorResponse,
} from "@/lib/api-helpers";
import { ownedEventWhere, requireRole } from "@/lib/authorization";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { eventoSchema } from "@/lib/validations/events";
import { eventUpdateData, validateEventUpdate } from "@/lib/event-access";

interface RouteParams {
  params: Promise<{ eventoId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuthenticatedUser(request);
    requireRole(user, "ORGANIZADOR");

    const { eventoId } = await params;
    const parsedId = uuidSchema.safeParse(eventoId);
    if (!parsedId.success) return zodErrorResponse(parsedId.error);

    const event = await prisma.evento.findFirst({
      where: ownedEventWhere(parsedId.data, user.id),
      include: {
        organizador: {
          select: { id: true, nombre: true, apellido: true, fotoPerfilUrl: true },
        },
        contrataciones: {
          where: { estado: "ACORDADO" },
          include: {
            proyectoMusical: {
              select: { id: true, nombre: true, genero: true, imagenUrl: true },
            },
          },
        },
        entradas: true,
      },
    });

    if (!event) throw new NotFoundError("Evento");
    return Response.json(event, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuthenticatedUser(request);
    requireRole(user, "ORGANIZADOR");

    const { eventoId } = await params;
    const parsedId = uuidSchema.safeParse(eventoId);
    if (!parsedId.success) return zodErrorResponse(parsedId.error);

    const existing = await prisma.evento.findFirst({
      where: ownedEventWhere(parsedId.data, user.id),
      include: { contrataciones: { select: { estado: true } } },
    });
    if (!existing) throw new NotFoundError("Evento");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("Cuerpo de solicitud inválido");
    }

    const parsed = eventoSchema.partial().safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    validateEventUpdate(existing, parsed.data);

    const updated = await prisma.evento.update({
      where: { id: parsedId.data, organizadorId: user.id },
      data: eventUpdateData(parsed.data),
    });

    return Response.json(updated, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
