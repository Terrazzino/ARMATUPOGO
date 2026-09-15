import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { uuidSchema, zodErrorResponse, errorResponse } from "@/lib/api-helpers";
import { calcularReputacion } from "@/lib/valoraciones";

interface RouteParams {
  params: Promise<{ usuarioId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { usuarioId } = await params;
    const parsedId = uuidSchema.safeParse(usuarioId);
    if (!parsedId.success) {
      return zodErrorResponse(parsedId.error);
    }

    const user = await prisma.usuario.findUnique({
      where: { id: parsedId.data },
    });

    if (!user) {
      return errorResponse("Usuario no encontrado", 404);
    }

    const ratings = await prisma.valoracion.findMany({
      where: { destinatarioId: parsedId.data },
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
    console.error("GET /api/usuarios/:usuarioId/valoraciones error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

