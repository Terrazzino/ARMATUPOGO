import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  apiErrorResponse,
  requireAuthenticatedUser,
  zodErrorResponse,
} from "@/lib/api-helpers";
import { requireRole } from "@/lib/authorization";
import { ValidationError } from "@/lib/errors";
import { projectCreateData } from "@/lib/project-access";
import { proyectoMusicalSchema } from "@/lib/validations/projects";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);
    requireRole(user, "MUSICO");

    const projects = await prisma.proyectoMusical.findMany({
      where: { usuarioId: user.id },
      orderBy: { creadoEn: "desc" },
    });

    return Response.json(projects, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);
    requireRole(user, "MUSICO");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("Cuerpo de solicitud inválido");
    }

    const parsed = proyectoMusicalSchema.safeParse(body);
    if (!parsed.success) {
      return zodErrorResponse(parsed.error);
    }

    const project = await prisma.proyectoMusical.create({
      data: projectCreateData(user.id, parsed.data),
    });

    return Response.json(project, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

