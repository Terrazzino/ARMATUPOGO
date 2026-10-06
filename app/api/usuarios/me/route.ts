import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  apiErrorResponse,
  requireAuthenticatedUser,
  zodErrorResponse,
} from "@/lib/api-helpers";
import { ValidationError } from "@/lib/errors";
import { actualizarPerfilSchema } from "@/lib/validations/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);

    return Response.json(user, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("Cuerpo de solicitud inválido");
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
    return apiErrorResponse(error);
  }
}

