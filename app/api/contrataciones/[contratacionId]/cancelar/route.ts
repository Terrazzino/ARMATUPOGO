import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUser,
  uuidSchema,
  zodErrorResponse,
  errorResponse,
} from "@/lib/api-helpers";
import { validarCancelacionContratacion } from "@/lib/contrataciones";

interface RouteParams {
  params: Promise<{ contratacionId: string }>;
}

const cancelarBodySchema = z.object({
  motivoCancelacion: z
    .string()
    .trim()
    .min(5, "El motivo debe tener al menos 5 caracteres")
    .max(500, "El motivo no puede superar los 500 caracteres")
    .optional()
    .or(z.literal("")),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse("Autenticación requerida", 401);
    }

    const { contratacionId } = await params;
    const parsedId = uuidSchema.safeParse(contratacionId);
    if (!parsedId.success) {
      return zodErrorResponse(parsedId.error);
    }

    let motivoCancelacion: string | null = null;
    try {
      const body = await request.json();
      const parsedBody = cancelarBodySchema.safeParse(body);
      if (!parsedBody.success) {
        return zodErrorResponse(parsedBody.error);
      }
      motivoCancelacion = parsedBody.data.motivoCancelacion || null;
    } catch {
      // Body es opcional
    }

    const contract = await prisma.contratacion.findUnique({
      where: { id: parsedId.data },
      include: { evento: true },
    });

    if (!contract) {
      return errorResponse("Contratación no encontrada", 404);
    }

    const ahora = new Date();
    const validacion = validarCancelacionContratacion({
      contratacion: {
        id: contract.id,
        organizadorId: contract.organizadorId,
        musicoId: contract.musicoId,
        estado: contract.estado,
      },
      evento: {
        startsAt: contract.evento.startsAt,
      },
      usuarioId: user.id,
      ahora,
    });

    if (!validacion.ok) {
      switch (validacion.motivo) {
        case "USUARIO_NO_PARTICIPANTE":
          return errorResponse("No tienes permiso para cancelar esta contratación", 403);
        case "CONTRATACION_YA_CANCELADA":
          return errorResponse("La contratación ya está cancelada", 409);
        case "CONTRATACION_YA_COMPLETADA":
          return errorResponse(
            "La contratación ya está completada y no puede cancelarse",
            409
          );
        case "EVENTO_YA_COMENZO_NO_SE_PUEDE_CANCELAR_ACUERDO":
          return errorResponse(
            "No se puede cancelar una contratación acordada cuando el evento ya comenzó",
            409
          );
      }
    }

    const updated = await prisma.contratacion.update({
      where: { id: parsedId.data },
      data: {
        estado: "CANCELADO",
        fechaCancelacion: ahora,
        motivoCancelacion,
      },
    });

    return Response.json(updated, { status: 200 });
  } catch (error) {
    console.error("POST /api/contrataciones/:contratacionId/cancelar error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

