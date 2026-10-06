import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, uuidSchema, zodErrorResponse } from "@/lib/api-helpers";
import { NotFoundError } from "@/lib/errors";
import { publicEventDetailSelect } from "@/lib/event-access";

interface RouteParams {
  params: Promise<{ eventoId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { eventoId } = await params;
    const parsedId = uuidSchema.safeParse(eventoId);
    if (!parsedId.success) return zodErrorResponse(parsedId.error);

    const event = await prisma.evento.findFirst({
      where: { id: parsedId.data, estado: "PUBLICADO" },
      select: publicEventDetailSelect,
    });

    if (!event) throw new NotFoundError("Evento");
    return Response.json(event, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
