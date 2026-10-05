import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  apiErrorResponse,
  requireAuthenticatedUser,
  uuidSchema,
  zodErrorResponse,
} from "@/lib/api-helpers";
import { ownedProjectWhere, requireRole } from "@/lib/authorization";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { projectUpdateData } from "@/lib/project-access";
import { proyectoMusicalSchema } from "@/lib/validations/projects";

interface RouteParams {
  params: Promise<{ proyectoId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuthenticatedUser(request);
    requireRole(user, "MUSICO");

    const { proyectoId } = await params;
    const parsedId = uuidSchema.safeParse(proyectoId);
    if (!parsedId.success) {
      return zodErrorResponse(parsedId.error);
    }

    const project = await prisma.proyectoMusical.findFirst({
      where: ownedProjectWhere(parsedId.data, user.id),
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

    if (!project) throw new NotFoundError("Proyecto musical");

    return Response.json(project, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuthenticatedUser(request);
    requireRole(user, "MUSICO");

    const { proyectoId } = await params;
    const parsedId = uuidSchema.safeParse(proyectoId);
    if (!parsedId.success) {
      return zodErrorResponse(parsedId.error);
    }

    const existing = await prisma.proyectoMusical.findFirst({
      where: ownedProjectWhere(parsedId.data, user.id),
    });

    if (!existing) throw new NotFoundError("Proyecto musical");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("Cuerpo de solicitud inválido");
    }

    const parsed = proyectoMusicalSchema.partial().safeParse(body);
    if (!parsed.success) {
      return zodErrorResponse(parsed.error);
    }

    const updated = await prisma.proyectoMusical.update({
      where: { id: parsedId.data, usuarioId: user.id },
      data: projectUpdateData(parsed.data),
    });

    return Response.json(updated, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuthenticatedUser(request);
    requireRole(user, "MUSICO");

    const { proyectoId } = await params;
    const parsedId = uuidSchema.safeParse(proyectoId);
    if (!parsedId.success) {
      return zodErrorResponse(parsedId.error);
    }

    const existing = await prisma.proyectoMusical.findFirst({
      where: ownedProjectWhere(parsedId.data, user.id),
    });

    if (!existing) throw new NotFoundError("Proyecto musical");

    // Baja lógica
    const updated = await prisma.proyectoMusical.update({
      where: { id: parsedId.data, usuarioId: user.id },
      data: { estaActivo: false },
    });

    return Response.json(updated, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

