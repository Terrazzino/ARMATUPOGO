import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUser,
  uuidSchema,
  zodErrorResponse,
  errorResponse,
} from "@/lib/api-helpers";
import { validarRechazoPostulacion } from "@/lib/postulaciones";

interface RouteParams {
  params: Promise<{ postulacionId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse("Autenticación requerida", 401);
    }

    if (user.rol !== "ORGANIZADOR") {
      return errorResponse("Solo los organizadores pueden rechazar postulaciones", 403);
    }

    const { postulacionId } = await params;
    const parsedId = uuidSchema.safeParse(postulacionId);
    if (!parsedId.success) {
      return zodErrorResponse(parsedId.error);
    }

    const postulacion = await prisma.postulacion.findUnique({
      where: { id: parsedId.data },
      include: { evento: true },
    });

    if (!postulacion) {
      return errorResponse("Postulación no encontrada", 404);
    }

    if (postulacion.evento.organizadorId !== user.id) {
      return errorResponse("No tienes permisos para rechazar esta postulación", 403);
    }

    const validacion = validarRechazoPostulacion({
      postulacion: { estado: postulacion.estado },
      evento: { organizadorId: postulacion.evento.organizadorId },
      usuarioId: user.id,
    });

    if (!validacion.ok) {
      return errorResponse("La postulación ya no puede rechazarse", 409);
    }

    const updated = await prisma.postulacion.updateMany({
      where: {
        id: parsedId.data,
        estado: "PENDIENTE",
        evento: { organizadorId: user.id },
      },
      data: { estado: "RECHAZADA" },
    });

    if (updated.count !== 1) {
      return errorResponse("La postulación ya fue procesada por otra operación", 409);
    }

    const finalPostulacion = await prisma.postulacion.findUniqueOrThrow({
      where: { id: parsedId.data },
    });

    return Response.json(finalPostulacion, { status: 200 });
  } catch (error) {
    console.error("POST /api/postulaciones/:postulacionId/rechazar error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

