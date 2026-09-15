import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { uuidSchema, zodErrorResponse, errorResponse } from "@/lib/api-helpers";

interface RouteParams {
  params: Promise<{ eventoId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventoId } = await params;
    const parsedId = uuidSchema.safeParse(eventoId);
    if (!parsedId.success) {
      return zodErrorResponse(parsedId.error);
    }

    const event = await prisma.evento.findUnique({
      where: {
        id: parsedId.data,
      },
      select: {
        id: true,
        titulo: true,
        descripcion: true,
        startsAt: true,
        endsAt: true,
        ubicacion: true,
        nombreLugar: true,
        ciudad: true,
        cantidadMusicosRequerida: true,
        cacheOfrecido: true,
        estado: true,
        bannerUrl: true,
        organizador: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            fotoPerfilUrl: true,
          },
        },
        contrataciones: {
          where: { estado: "ACORDADO" },
          select: {
            id: true,
            proyectoMusical: {
              select: {
                id: true,
                nombre: true,
                genero: true,
                imagenUrl: true,
                spotifyUrl: true,
                youtubeUrl: true,
                instagramUrl: true,
                sitioWebUrl: true,
              },
            },
          },
        },
        entradas: {
          select: {
            id: true,
            tipoEntrada: true,
            precio: true,
            capacidad: true,
            descripcion: true,
            urlCompraExterna: true,
            esGratuita: true,
          },
        },
      },
    });

    if (!event || event.estado === "CANCELADO") {
      return errorResponse("Evento no encontrado", 404);
    }

    return Response.json(event, { status: 200 });
  } catch (error) {
    console.error("GET /api/publico/eventos/:eventoId error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

