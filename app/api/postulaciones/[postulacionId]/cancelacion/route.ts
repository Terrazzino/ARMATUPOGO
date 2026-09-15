import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUser,
  uuidSchema,
  zodErrorResponse,
  errorResponse,
} from "@/lib/api-helpers";
import { validarCancelacionPostulacion } from "@/lib/postulaciones";

interface RouteParams {
  params: Promise<{ postulacionId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse("Autenticación requerida", 401);
    }

    const { postulacionId } = await params;
    const parsedId = uuidSchema.safeParse(postulacionId);
    if (!parsedId.success) {
      return zodErrorResponse(parsedId.error);
    }

    const postulacion = await prisma.postulacion.findUnique({
      where: { id: parsedId.data },
    });

    if (!postulacion) {
      return errorResponse("Postulación no encontrada", 404);
    }

    const validacion = validarCancelacionPostulacion({
      postulacion: {
        musicoId: postulacion.musicoId,
        estado: postulacion.estado,
      },
      usuarioId: user.id,
    });

    if (!validacion.ok) {
      switch (validacion.motivo) {
        case "USUARIO_NO_PROPIETARIO":
          return errorResponse("No tienes permiso para cancelar esta postulación", 403);
        case "POSTULACION_NO_PENDIENTE":
          return errorResponse("La postulación ya no puede cancelarse", 409);
      }
    }

    const updated = await prisma.postulacion.update({
      where: { id: parsedId.data },
      data: { estado: "CANCELADA" },
    });

    return Response.json(updated, { status: 200 });
  } catch (error) {
    console.error("POST /api/postulaciones/:postulacionId/cancelacion error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

