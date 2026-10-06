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
import { createPostulationForMusician } from "@/lib/postulation-access";
import { crearPostulacionSchema } from "@/lib/validations/contracts";

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
      select: { id: true },
    });
    if (!event) throw new NotFoundError("Evento");

    const postulations = await prisma.postulacion.findMany({
      where: { eventoId: event.id },
      orderBy: { creadoEn: "desc" },
      include: {
        proyectoMusical: {
          select: { id: true, nombre: true, genero: true, imagenUrl: true },
        },
        musico: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            fotoPerfilUrl: true,
          },
        },
        contratacion: { select: { id: true, estado: true } },
      },
    });

    return Response.json(postulations, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuthenticatedUser(request);
    requireRole(user, "MUSICO");

    const { eventoId } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("Cuerpo de solicitud inválido");
    }

    const parsed = crearPostulacionSchema.safeParse({
      ...(typeof body === "object" && body !== null ? body : {}),
      eventoId,
    });
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const postulation = await createPostulationForMusician({
      eventId: parsed.data.eventoId,
      projectId: parsed.data.proyectoMusicalId,
      musicianId: user.id,
      initialMessage: parsed.data.mensaje,
      initialOfferAmount: parsed.data.initialOfferAmount,
    });

    return Response.json(postulation, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
