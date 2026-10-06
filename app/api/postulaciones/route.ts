import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  apiErrorResponse,
  requireAuthenticatedUser,
} from "@/lib/api-helpers";
import { postulationListInclude } from "@/lib/postulation-access";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);

    const postulations = await prisma.postulacion.findMany({
      where:
        user.rol === "ORGANIZADOR"
          ? { evento: { organizadorId: user.id } }
          : { musicoId: user.id },
      orderBy: { creadoEn: "desc" },
      include: postulationListInclude,
    });

    return Response.json(postulations, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
