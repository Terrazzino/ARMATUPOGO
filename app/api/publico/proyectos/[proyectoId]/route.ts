import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, uuidSchema, zodErrorResponse } from "@/lib/api-helpers";
import { NotFoundError } from "@/lib/errors";
import { publicProjectDetailSelect } from "@/lib/project-access";

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

    const project = await prisma.proyectoMusical.findFirst({
      where: {
        id: parsedId.data,
        estaActivo: true,
      },
      select: publicProjectDetailSelect,
    });

    if (!project) throw new NotFoundError("Proyecto musical");

    return Response.json(project, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

