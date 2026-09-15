import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUser,
  uuidSchema,
  zodErrorResponse,
  errorResponse,
} from "@/lib/api-helpers";

interface RouteParams {
  params: Promise<{ postulacionId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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
      include: {
        evento: true,
        proyectoMusical: true,
        musico: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            fotoPerfilUrl: true,
          },
        },
        contratacion: true,
      },
    });

    if (!postulacion) {
      return errorResponse("Postulación no encontrada", 404);
    }

    const esParticipante =
      postulacion.musicoId === user.id || postulacion.evento.organizadorId === user.id;

    if (!esParticipante) {
      return errorResponse("No tienes permisos para ver esta postulación", 403);
    }

    return Response.json(postulacion, { status: 200 });
  } catch (error) {
    console.error("GET /api/postulaciones/:postulacionId error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

