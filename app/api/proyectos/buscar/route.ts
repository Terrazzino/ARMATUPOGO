import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getAuthenticatedUser, errorResponse } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse("Autenticación requerida", 401);
    }

    const { searchParams } = new URL(request.url);
    const genero = searchParams.get("genero") || searchParams.get("genre");
    const ciudad = searchParams.get("ciudad") || searchParams.get("city");
    const search = searchParams.get("search") || searchParams.get("q");

    const where: Prisma.ProyectoMusicalWhereInput = {
      estaActivo: true,
    };

    if (genero) {
      where.genero = { contains: genero, mode: "insensitive" };
    }

    if (ciudad) {
      where.ciudad = { contains: ciudad, mode: "insensitive" };
    }

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: "insensitive" } },
        { descripcion: { contains: search, mode: "insensitive" } },
        { genero: { contains: search, mode: "insensitive" } },
      ];
    }

    const projects = await prisma.proyectoMusical.findMany({
      where,
      orderBy: { creadoEn: "desc" },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            fotoPerfilUrl: true,
          },
        },
      },
    });

    return Response.json(projects, { status: 200 });
  } catch (error) {
    console.error("GET /api/proyectos/buscar error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

