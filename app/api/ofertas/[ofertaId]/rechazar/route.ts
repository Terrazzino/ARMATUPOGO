import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUser,
  uuidSchema,
  zodErrorResponse,
  errorResponse,
} from "@/lib/api-helpers";
import { validarRechazoOferta } from "@/lib/ofertas";

interface RouteParams {
  params: Promise<{ ofertaId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse("Autenticación requerida", 401);
    }

    const { ofertaId } = await params;
    const parsedId = uuidSchema.safeParse(ofertaId);
    if (!parsedId.success) {
      return zodErrorResponse(parsedId.error);
    }

    const offer = await prisma.oferta.findUnique({
      where: { id: parsedId.data },
      include: { contratacion: true },
    });

    if (!offer) {
      return errorResponse("Oferta no encontrada", 404);
    }

    const contract = offer.contratacion;

    const validacion = validarRechazoOferta({
      oferta: {
        id: offer.id,
        remitenteId: offer.remitenteId,
        estado: offer.estado,
        monto: Number(offer.monto),
      },
      contratacion: {
        id: contract.id,
        organizadorId: contract.organizadorId,
        musicoId: contract.musicoId,
        estado: contract.estado,
      },
      usuarioId: user.id,
    });

    if (!validacion.ok) {
      switch (validacion.motivo) {
        case "USUARIO_NO_PARTICIPANTE":
          return errorResponse("No tienes acceso a esta negociación", 403);
        case "EMISOR_NO_PUEDE_RECHAZAR_PROPIA_OFERTA":
          return errorResponse("No puedes rechazar tu propia oferta", 409);
        case "OFERTA_NO_PROPUESTA":
          return errorResponse("Solo se pueden rechazar ofertas vigentes", 409);
        case "CONTRATACION_NO_NEGOCIANDO":
          return errorResponse(
            "No se pueden rechazar ofertas en una contratación cerrada",
            409
          );
      }
    }

    const updated = await prisma.oferta.updateMany({
      where: {
        id: parsedId.data,
        estado: "PROPUESTA",
        contratacion: {
          estado: "NEGOCIANDO",
        },
      },
      data: { estado: "RECHAZADA" },
    });

    if (updated.count !== 1) {
      return errorResponse("Solo se pueden rechazar ofertas vigentes", 409);
    }

    const finalOffer = await prisma.oferta.findUniqueOrThrow({
      where: { id: parsedId.data },
    });

    return Response.json(finalOffer, { status: 200 });
  } catch (error) {
    console.error("POST /api/ofertas/:ofertaId/rechazar error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

