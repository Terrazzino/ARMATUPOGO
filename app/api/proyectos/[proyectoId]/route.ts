import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUser,
  uuidSchema,
  zodErrorResponse,
  errorResponse,
} from "@/lib/api-helpers";
import { proyectoMusicalSchema } from "@/lib/validations/projects";

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
      include: {
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

    if (!project) {
      return errorResponse("Proyecto musical no encontrado", 404);
    }

    return Response.json(project, { status: 200 });
  } catch (error) {
    console.error("GET /api/proyectos/:proyectoId error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse("Autenticación requerida", 401);
    }

    if (user.rol !== "MUSICO") {
      return errorResponse("Solo los músicos pueden modificar proyectos", 403);
    }

    const { proyectoId } = await params;
    const parsedId = uuidSchema.safeParse(proyectoId);
    if (!parsedId.success) {
      return zodErrorResponse(parsedId.error);
    }

    const existing = await prisma.proyectoMusical.findUnique({
      where: { id: parsedId.data },
    });

    if (!existing) {
      return errorResponse("Proyecto musical no encontrado", 404);
    }

    if (existing.usuarioId !== user.id) {
      return errorResponse("No tienes permisos para modificar este proyecto", 403);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Cuerpo de solicitud inválido", 400);
    }

    const parsed = proyectoMusicalSchema.partial().safeParse(body);
    if (!parsed.success) {
      return zodErrorResponse(parsed.error);
    }

    const data = parsed.data;

    const updated = await prisma.proyectoMusical.update({
      where: { id: parsedId.data },
      data: {
        ...(data.nombre !== undefined && { nombre: data.nombre }),
        ...(data.genero !== undefined && { genero: data.genero }),
        ...(data.descripcion !== undefined && { descripcion: data.descripcion || null }),
        ...(data.cacheAproximado !== undefined && { cacheAproximado: data.cacheAproximado ?? null }),
        ...(data.ubicacion !== undefined && { ubicacion: data.ubicacion || null }),
        ...(data.ciudad !== undefined && { ciudad: data.ciudad || null }),
        ...(data.imagenUrl !== undefined && { imagenUrl: data.imagenUrl || null }),
        ...(data.spotifyUrl !== undefined && { spotifyUrl: data.spotifyUrl || null }),
        ...(data.youtubeUrl !== undefined && { youtubeUrl: data.youtubeUrl || null }),
        ...(data.instagramUrl !== undefined && { instagramUrl: data.instagramUrl || null }),
        ...(data.sitioWebUrl !== undefined && { sitioWebUrl: data.sitioWebUrl || null }),
        ...(data.enlacesPersonalizados !== undefined && {
          enlacesPersonalizados: data.enlacesPersonalizados,
        }),
      },
    });

    return Response.json(updated, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/proyectos/:proyectoId error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse("Autenticación requerida", 401);
    }

    if (user.rol !== "MUSICO") {
      return errorResponse("Solo los músicos pueden desactivar proyectos", 403);
    }

    const { proyectoId } = await params;
    const parsedId = uuidSchema.safeParse(proyectoId);
    if (!parsedId.success) {
      return zodErrorResponse(parsedId.error);
    }

    const existing = await prisma.proyectoMusical.findUnique({
      where: { id: parsedId.data },
    });

    if (!existing) {
      return errorResponse("Proyecto musical no encontrado", 404);
    }

    if (existing.usuarioId !== user.id) {
      return errorResponse("No tienes permisos para modificar este proyecto", 403);
    }

    // Baja lógica
    const updated = await prisma.proyectoMusical.update({
      where: { id: parsedId.data },
      data: { estaActivo: false },
    });

    return Response.json(updated, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/proyectos/:proyectoId error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

