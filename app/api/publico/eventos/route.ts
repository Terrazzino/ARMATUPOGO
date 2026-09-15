import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { errorResponse } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ciudad = searchParams.get("ciudad") || searchParams.get("city");
    const search = searchParams.get("search") || searchParams.get("q");

    const ahora = new Date();

    const where: Prisma.EventoWhereInput = {
      estado: "PUBLICADO",
      endsAt: {
        gt: ahora,
      },
    };

    if (ciudad) {
      where.ciudad = { contains: ciudad, mode: "insensitive" };
    }

    if (search) {
      where.OR = [
        { titulo: { contains: search, mode: "insensitive" } },
        { descripcion: { contains: search, mode: "insensitive" } },
        { ubicacion: { contains: search, mode: "insensitive" } },
        { nombreLugar: { contains: search, mode: "insensitive" } },
      ];
    }

    const events = await prisma.evento.findMany({
      where,
      orderBy: { startsAt: "asc" },
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
              },
            },
          },
        },
      },
    });

    return Response.json(events, { status: 200 });
  } catch (error) {
    console.error("GET /api/publico/eventos error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

