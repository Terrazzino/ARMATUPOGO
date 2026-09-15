import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, zodErrorResponse, errorResponse } from "@/lib/api-helpers";
import { actualizarPerfilSchema } from "@/lib/validations/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse("Autenticación requerida", 401);
    }

    return Response.json(user, { status: 200 });
  } catch (error) {
    console.error("GET /api/usuarios/me error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse("Autenticación requerida", 401);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Cuerpo de solicitud inválido", 400);
    }

    const parsed = actualizarPerfilSchema.safeParse(body);
    if (!parsed.success) {
      return zodErrorResponse(parsed.error);
    }

    const { nombre, apellido, biografia, telefono, fotoPerfilUrl } = parsed.data;

    const updatedUser = await prisma.usuario.update({
      where: { id: user.id },
      data: {
        ...(nombre !== undefined && { nombre }),
        ...(apellido !== undefined && { apellido }),
        ...(biografia !== undefined && { biografia: biografia || null }),
        ...(telefono !== undefined && { telefono: telefono || null }),
        ...(fotoPerfilUrl !== undefined && { fotoPerfilUrl: fotoPerfilUrl || null }),
      },
    });

    return Response.json(updatedUser, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/usuarios/me error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

