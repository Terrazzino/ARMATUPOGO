import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUser,
  uuidSchema,
  zodErrorResponse,
  errorResponse,
} from "@/lib/api-helpers";
import { validarFinalizacionContratacion } from "@/lib/contrataciones";

interface RouteParams {
  params: Promise<{ contratacionId: string }>;
}

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

    const contract = await prisma.contratacion.findUnique({
      where: { id: parsedId.data },
      include: { evento: true },
    });

    if (!contract) {
      return errorResponse("Contratación no encontrada", 404);
    }

    const ahora = new Date();
    const validacion = validarFinalizacionContratacion({
      contratacion: {
        id: contract.id,
        organizadorId: contract.organizadorId,
        musicoId: contract.musicoId,
        estado: contract.estado,
      },
      evento: {
        endsAt: contract.evento.endsAt,
      },
      usuarioId: user.id,
      ahora,
    });

    if (!validacion.ok) {
      switch (validacion.motivo) {
        case "USUARIO_NO_PARTICIPANTE":
          return errorResponse("No formas parte de esta contratación", 403);
        case "ESTADO_INVALIDO_PARA_COMPLETAR":
          return errorResponse(
            "Solo se puede completar una contratación acordada",
            409
          );
        case "EVENTO_NO_FINALIZO":
          return errorResponse("El evento todavía no finalizó", 409);
      }
    }

    const updated = await prisma.contratacion.update({
      where: { id: parsedId.data },
      data: {
        estado: "COMPLETADO",
      },
      include: {
        evento: true,
        proyectoMusical: true,
      },
    });

    return Response.json(updated, { status: 200 });
  } catch (error) {
    console.error("POST /api/contrataciones/:contratacionId/completar error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

