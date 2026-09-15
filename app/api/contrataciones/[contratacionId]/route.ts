import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUser,
  uuidSchema,
  zodErrorResponse,
  errorResponse,
} from "@/lib/api-helpers";

interface RouteParams {
  params: Promise<{ contratacionId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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
      include: {
        evento: true,
        proyectoMusical: true,
        organizador: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
        musico: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
        ofertas: {
          orderBy: { creadoEn: "asc" },
          include: {
            remitente: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                rol: true,
              },
            },
          },
        },
        valoraciones: true,
      },
    });

    if (!contract) {
      return errorResponse("Contratación no encontrada", 404);
    }

    const esParticipante =
      contract.organizadorId === user.id || contract.musicoId === user.id;

    if (!esParticipante) {
      return errorResponse("No tienes acceso a esta negociación", 403);
    }

    return Response.json(contract, { status: 200 });
  } catch (error) {
    console.error("GET /api/contrataciones/:contratacionId error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

