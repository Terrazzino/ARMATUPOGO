import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  apiErrorResponse,
  requireAuthenticatedUser,
  uuidSchema,
  zodErrorResponse,
} from "@/lib/api-helpers";
import { NotFoundError } from "@/lib/errors";
import { participatingPostulationWhere } from "@/lib/postulation-access";

interface RouteParams {
  params: Promise<{ postulacionId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuthenticatedUser(request);

    const { postulacionId } = await params;
    const parsedId = uuidSchema.safeParse(postulacionId);
    if (!parsedId.success) return zodErrorResponse(parsedId.error);

    const postulation = await prisma.postulacion.findFirst({
      where: participatingPostulationWhere(parsedId.data, user.id),
      include: {
        evento: true,
        proyectoMusical: true,
        musico: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            fotoPerfilUrl: true,
          },
        },
        contratacion: true,
      },
    });
    if (!postulation) throw new NotFoundError("Postulación");

    return Response.json(postulation, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
