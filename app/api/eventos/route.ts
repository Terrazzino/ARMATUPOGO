import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import type { EstadoEvento } from "@prisma/client";
import { getAuthenticatedUser, zodErrorResponse, errorResponse } from "@/lib/api-helpers";
import { eventoSchema } from "@/lib/validations/events";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse("Autenticación requerida", 401);
    }

    if (user.rol === "ORGANIZADOR") {
      const events = await prisma.evento.findMany({
        where: { organizadorId: user.id },
        orderBy: { startsAt: "asc" },
        include: {
          contrataciones: {
            select: {
              id: true,
              estado: true,
              montoPactado: true,
              proyectoMusical: {
                select: {
                  id: true,
                  nombre: true,
                  genero: true,
                },
              },
            },
          },
        },
      });
      return Response.json(events, { status: 200 });
    }

    // Para Músico: eventos publicados
    const events = await prisma.evento.findMany({
      where: { estado: "PUBLICADO" },
      orderBy: { startsAt: "asc" },
      include: {
        organizador: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
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
              },
            },
          },
        },
      },
    });

    return Response.json(events, { status: 200 });
  } catch (error) {
    console.error("GET /api/eventos error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse("Autenticación requerida", 401);
    }

    if (user.rol !== "ORGANIZADOR") {
      return errorResponse("Solo los organizadores pueden publicar eventos", 403);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Cuerpo de solicitud inválido", 400);
    }

    const parsed = eventoSchema.safeParse(body);
    if (!parsed.success) {
      return zodErrorResponse(parsed.error);
    }

    const data = parsed.data;

    // Validar coherencia temporal
    const inicio = new Date(data.startsAt);
    const fin = new Date(data.endsAt);
    if (fin.getTime() <= inicio.getTime()) {
      return errorResponse("La fecha de finalización debe ser posterior a la de inicio", 400);
    }

    const event = await prisma.evento.create({
      data: {
        organizadorId: user.id,
        titulo: data.titulo,
        descripcion: data.descripcion || null,
        startsAt: inicio,
        endsAt: fin,
        ubicacion: data.ubicacion,
        nombreLugar: data.nombreLugar || null,
        ciudad: data.ciudad || null,
        cantidadMusicosRequerida: data.cantidadMusicosRequerida,
        cacheOfrecido: data.cacheOfrecido ?? null,
        estado: (data.estado as EstadoEvento) || "PUBLICADO",
        bannerUrl: data.bannerUrl || null,
      },
    });

    return Response.json(event, { status: 201 });
  } catch (error) {
    console.error("POST /api/eventos error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

