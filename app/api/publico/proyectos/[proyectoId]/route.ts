import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { uuidSchema, zodErrorResponse, errorResponse } from "@/lib/api-helpers";

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
      where: {
        id: parsedId.data,
      },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        genero: true,
        cacheAproximado: true,
        ubicacion: true,
        ciudad: true,
        imagenUrl: true,
        spotifyUrl: true,
        youtubeUrl: true,
        instagramUrl: true,
        sitioWebUrl: true,
        enlacesPersonalizados: true,
        estaActivo: true,
        creadoEn: true,
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            fotoPerfilUrl: true,
          },
        },
        valoraciones: {
          select: {
            id: true,
            puntaje: true,
            comentario: true,
            creadoEn: true,
            autor: {
              select: {
                nombre: true,
                apellido: true,
              },
            },
          },
        },
      },
    });

    if (!project || !project.estaActivo) {
      return errorResponse("Proyecto musical no encontrado", 404);
    }

    return Response.json(project, { status: 200 });
  } catch (error) {
    console.error("GET /api/publico/proyectos/:proyectoId error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

