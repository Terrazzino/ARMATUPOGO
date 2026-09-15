import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, errorResponse } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse("Autenticación requerida", 401);
    }

    let postulaciones;

    if (user.rol === "ORGANIZADOR") {
      postulaciones = await prisma.postulacion.findMany({
        where: {
          evento: { organizadorId: user.id },
        },
        orderBy: { creadoEn: "desc" },
        include: {
          evento: {
            select: {
              id: true,
              titulo: true,
              startsAt: true,
              endsAt: true,
              ubicacion: true,
            },
          },
          proyectoMusical: {
            select: {
              id: true,
              nombre: true,
              genero: true,
              imagenUrl: true,
            },
          },
          musico: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
            },
          },
          contratacion: {
            select: { id: true, estado: true },
          },
        },
      });
    } else {
      postulaciones = await prisma.postulacion.findMany({
        where: {
          musicoId: user.id,
        },
        orderBy: { creadoEn: "desc" },
        include: {
          evento: {
            select: {
              id: true,
              titulo: true,
              startsAt: true,
              endsAt: true,
              ubicacion: true,
            },
          },
          proyectoMusical: {
            select: {
              id: true,
              nombre: true,
              genero: true,
              imagenUrl: true,
            },
          },
          contratacion: {
            select: { id: true, estado: true },
          },
        },
      });
    }

    return Response.json(postulaciones, { status: 200 });
  } catch (error) {
    console.error("GET /api/postulaciones error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

