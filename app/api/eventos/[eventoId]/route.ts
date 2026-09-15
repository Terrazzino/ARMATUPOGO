import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import type { EstadoEvento } from "@prisma/client";
import {
  getAuthenticatedUser,
  uuidSchema,
  zodErrorResponse,
  errorResponse,
} from "@/lib/api-helpers";
import { eventoSchema } from "@/lib/validations/events";
import { validarModificacionFechasEvento } from "@/lib/contrataciones";
import { validarReduccionCupos } from "@/lib/cupos";

interface RouteParams {
  params: Promise<{ eventoId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse("Autenticación requerida", 401);
    }

    const { eventoId } = await params;
    const parsedId = uuidSchema.safeParse(eventoId);
    if (!parsedId.success) {
      return zodErrorResponse(parsedId.error);
    }

    const event = await prisma.evento.findUnique({
      where: { id: parsedId.data },
      include: {
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
          include: {
            proyectoMusical: {
              select: {
                id: true,
                nombre: true,
                genero: true,
                imagenUrl: true,
              },
            },
          },
        },
        entradas: true,
      },
    });

    if (!event) {
      return errorResponse("Evento no encontrado", 404);
    }

    return Response.json(event, { status: 200 });
  } catch (error) {
    console.error("GET /api/eventos/:eventoId error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse("Autenticación requerida", 401);
    }

    if (user.rol !== "ORGANIZADOR") {
      return errorResponse("Solo los organizadores pueden modificar eventos", 403);
    }

    const { eventoId } = await params;
    const parsedId = uuidSchema.safeParse(eventoId);
    if (!parsedId.success) {
      return zodErrorResponse(parsedId.error);
    }

    const existing = await prisma.evento.findUnique({
      where: { id: parsedId.data },
      include: {
        contrataciones: {
          select: { estado: true },
        },
      },
    });

    if (!existing) {
      return errorResponse("Evento no encontrado", 404);
    }

    if (existing.organizadorId !== user.id) {
      return errorResponse("No tienes permisos para modificar este evento", 403);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Cuerpo de solicitud inválido", 400);
    }

    const parsed = eventoSchema.partial().safeParse(body);
    if (!parsed.success) {
      return zodErrorResponse(parsed.error);
    }

    const data = parsed.data;

    // 1. Validar modificación de fechas si existen contrataciones activas
    const cambiaFechas = data.startsAt !== undefined || data.endsAt !== undefined;
    if (cambiaFechas) {
      const validacionFechas = validarModificacionFechasEvento({
        contrataciones: existing.contrataciones,
      });

      if (!validacionFechas.ok) {
        return errorResponse(
          "No se pueden modificar las fechas con contrataciones activas",
          409
        );
      }

      const nuevoInicio = data.startsAt ? new Date(data.startsAt) : existing.startsAt;
      const nuevoFin = data.endsAt ? new Date(data.endsAt) : existing.endsAt;

      if (nuevoFin.getTime() <= nuevoInicio.getTime()) {
        return errorResponse(
          "La fecha de finalización debe ser posterior a la de inicio",
          400
        );
      }
    }

    // 2. Validar reducción de cupos requeridos
    if (data.cantidadMusicosRequerida !== undefined) {
      const validacionCupos = validarReduccionCupos({
        nuevaCantidadRequerida: data.cantidadMusicosRequerida,
        contrataciones: existing.contrataciones,
      });

      if (!validacionCupos.ok) {
        return errorResponse(
          "No se pueden reducir los cupos por debajo de los ya acordados",
          409
        );
      }
    }

    const updated = await prisma.evento.update({
      where: { id: parsedId.data },
      data: {
        ...(data.titulo !== undefined && { titulo: data.titulo }),
        ...(data.descripcion !== undefined && { descripcion: data.descripcion || null }),
        ...(data.startsAt !== undefined && { startsAt: new Date(data.startsAt) }),
        ...(data.endsAt !== undefined && { endsAt: new Date(data.endsAt) }),
        ...(data.ubicacion !== undefined && { ubicacion: data.ubicacion }),
        ...(data.nombreLugar !== undefined && { nombreLugar: data.nombreLugar || null }),
        ...(data.ciudad !== undefined && { ciudad: data.ciudad || null }),
        ...(data.cantidadMusicosRequerida !== undefined && {
          cantidadMusicosRequerida: data.cantidadMusicosRequerida,
        }),
        ...(data.cacheOfrecido !== undefined && { cacheOfrecido: data.cacheOfrecido ?? null }),
        ...(data.estado !== undefined && { estado: data.estado as EstadoEvento }),
        ...(data.bannerUrl !== undefined && { bannerUrl: data.bannerUrl || null }),
      },
    });

    return Response.json(updated, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/eventos/:eventoId error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

