import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUser,
  uuidSchema,
  zodErrorResponse,
  errorResponse,
} from "@/lib/api-helpers";

interface RouteParams {
  params: Promise<{ eventoId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse("Autenticación requerida", 401);
    }

    if (user.rol !== "ORGANIZADOR") {
      return errorResponse("Solo los organizadores pueden cancelar eventos", 403);
    }

    const { eventoId } = await params;
    const parsedId = uuidSchema.safeParse(eventoId);
    if (!parsedId.success) {
      return zodErrorResponse(parsedId.error);
    }

    const existing = await prisma.evento.findUnique({
      where: { id: parsedId.data },
    });

    if (!existing) {
      return errorResponse("Evento no encontrado", 404);
    }

    if (existing.organizadorId !== user.id) {
      return errorResponse("No tienes permisos para cancelar este evento", 403);
    }

    if (existing.estado === "CANCELADO") {
      return errorResponse("El evento ya está cancelado", 409);
    }

    const ahora = new Date();
    if (ahora.getTime() >= existing.startsAt.getTime()) {
      return errorResponse("No se puede cancelar un evento que ya comenzó", 409);
    }

    // Transacción atómica de cancelación en cascada (§ 13 y § 25 spec)
    const cancelledEvent = await prisma.$transaction(async (tx) => {
      // 1. Cancelar evento
      const updated = await tx.evento.update({
        where: { id: parsedId.data },
        data: { estado: "CANCELADO" },
      });

      // 2. Cancelar postulaciones pendientes
      await tx.postulacion.updateMany({
        where: {
          eventoId: parsedId.data,
          estado: "PENDIENTE",
        },
        data: { estado: "CANCELADA" },
      });

      // 3. Cancelar contrataciones activas (NEGOCIANDO y ACORDADO)
      await tx.contratacion.updateMany({
        where: {
          eventoId: parsedId.data,
          estado: { in: ["NEGOCIANDO", "ACORDADO"] },
        },
        data: {
          estado: "CANCELADO",
          fechaCancelacion: ahora,
          motivoCancelacion: "Cancelación del evento por el organizador",
        },
      });

      return updated;
    });

    return Response.json(cancelledEvent, { status: 200 });
  } catch (error) {
    console.error("POST /api/eventos/:eventoId/cancelar error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

