import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { uuidSchema, zodErrorResponse, errorResponse } from "@/lib/api-helpers";
import { calcularReputacion } from "@/lib/valoraciones";

interface RouteParams {
  params: Promise<{ proyectoId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { proyectoId } = await params;
    const parsedId = uuidSchema.safeParse(proyectoId);
    if (!parsedId.success) {
      return zodErrorResponse(parsedId.error);
    }

    const project = await prisma.proyectoMusical.findUnique({
      where: { id: parsedId.data },
    });

    if (!project) {
      return errorResponse("Proyecto musical no encontrado", 404);
    }

    const ratings = await prisma.valoracion.findMany({
      where: { proyectoDestinatarioId: parsedId.data },
      orderBy: { creadoEn: "desc" },
      include: {
        autor: {
          select: {
            nombre: true,
            apellido: true,
            fotoPerfilUrl: true,
          },
        },
      },
    });

    const reputacion = calcularReputacion(ratings);

    return Response.json(
      {
        total: reputacion.total,
        promedio: reputacion.promedio,
        valoraciones: ratings,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/proyectos/:proyectoId/valoraciones error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

