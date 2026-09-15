import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, zodErrorResponse, errorResponse } from "@/lib/api-helpers";
import { proyectoMusicalSchema } from "@/lib/validations/projects";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse("Autenticación requerida", 401);
    }

    if (user.rol !== "MUSICO") {
      return errorResponse("Solo los músicos pueden listar sus proyectos", 403);
    }

    const projects = await prisma.proyectoMusical.findMany({
      where: { usuarioId: user.id },
      orderBy: { creadoEn: "desc" },
    });

    return Response.json(projects, { status: 200 });
  } catch (error) {
    console.error("GET /api/proyectos error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse("Autenticación requerida", 401);
    }

    if (user.rol !== "MUSICO") {
      return errorResponse("Solo los músicos pueden registrar proyectos", 403);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Cuerpo de solicitud inválido", 400);
    }

    const parsed = proyectoMusicalSchema.safeParse(body);
    if (!parsed.success) {
      return zodErrorResponse(parsed.error);
    }

    const data = parsed.data;

    const project = await prisma.proyectoMusical.create({
      data: {
        usuarioId: user.id,
        nombre: data.nombre,
        genero: data.genero,
        descripcion: data.descripcion || null,
        cacheAproximado: data.cacheAproximado ?? null,
        ubicacion: data.ubicacion || null,
        ciudad: data.ciudad || null,
        imagenUrl: data.imagenUrl || null,
        spotifyUrl: data.spotifyUrl || null,
        youtubeUrl: data.youtubeUrl || null,
        instagramUrl: data.instagramUrl || null,
        sitioWebUrl: data.sitioWebUrl || null,
        enlacesPersonalizados: data.enlacesPersonalizados ?? [],
        estaActivo: true,
      },
    });

    return Response.json(project, { status: 201 });
  } catch (error) {
    console.error("POST /api/proyectos error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

