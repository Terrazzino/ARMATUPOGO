import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUser,
  uuidSchema,
  zodErrorResponse,
  errorResponse,
} from "@/lib/api-helpers";
import { VALIDATION_LIMITS } from "@/lib/constants";
import { validarCreacionOferta } from "@/lib/ofertas";

interface RouteParams {
  params: Promise<{ contratacionId: string }>;
}

const crearOfertaBodySchema = z.object({
  monto: z
    .number()
    .min(0, "El monto de la oferta no puede ser negativo")
    .max(VALIDATION_LIMITS.MAX_PRICE, "El monto supera el límite permitido"),
  mensaje: z
    .string()
    .trim()
    .max(
      VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH,
      `El mensaje no puede superar los ${VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH} caracteres`
    )
    .optional()
    .or(z.literal("")),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse("Autenticación requerida", 401);
    }

    const { contratacionId } = await params;
    const parsedId = uuidSchema.safeParse(contratacionId);
    if (!parsedId.success) {
      return zodErrorResponse(parsedId.error);
    }

    const contract = await prisma.contratacion.findUnique({
      where: { id: parsedId.data },
    });

    if (!contract) {
      return errorResponse("Contratación no encontrada", 404);
    }

    if (contract.organizadorId !== user.id && contract.musicoId !== user.id) {
      return errorResponse("No tienes acceso a esta negociación", 403);
    }

    const offers = await prisma.oferta.findMany({
      where: { contratacionId: parsedId.data },
      orderBy: { creadoEn: "asc" },
      include: {
        remitente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            rol: true,
          },
        },
      },
    });

    return Response.json(offers, { status: 200 });
  } catch (error) {
    console.error("GET /api/contrataciones/:contratacionId/ofertas error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse("Autenticación requerida", 401);
    }

    const { contratacionId } = await params;
    const parsedContractId = uuidSchema.safeParse(contratacionId);
    if (!parsedContractId.success) {
      return zodErrorResponse(parsedContractId.error);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Cuerpo de solicitud inválido", 400);
    }

    const parsedBody = crearOfertaBodySchema.safeParse(body);
    if (!parsedBody.success) {
      return zodErrorResponse(parsedBody.error);
    }

    const { monto, mensaje } = parsedBody.data;

    const contract = await prisma.contratacion.findUnique({
      where: { id: parsedContractId.data },
      include: {
        ofertas: {
          select: {
            id: true,
            remitenteId: true,
            monto: true,
            estado: true,
          },
        },
      },
    });

    if (!contract) {
      return errorResponse("Contratación no encontrada", 404);
    }

    const ofertasParaDominio = contract.ofertas.map((o) => ({
      id: o.id,
      remitenteId: o.remitenteId,
      monto: Number(o.monto),
      estado: o.estado,
    }));

    const validacion = validarCreacionOferta({
      contratacion: {
        id: contract.id,
        organizadorId: contract.organizadorId,
        musicoId: contract.musicoId,
        estado: contract.estado,
      },
      usuarioId: user.id,
      monto,
      ofertasExistentes: ofertasParaDominio,
    });

    if (!validacion.ok) {
      switch (validacion.motivo) {
        case "USUARIO_NO_PARTICIPANTE":
          return errorResponse("No tienes acceso a esta negociación", 403);
        case "CONTRATACION_NO_NEGOCIANDO":
          return errorResponse(
            "No se pueden enviar ofertas en una contratación cerrada",
            409
          );
        case "MONTO_INVALIDO":
          return errorResponse("Datos inválidos", 400);
      }
    }

    // Transacción atómica (§ 25 spec)
    const newOffer = await prisma.$transaction(async (tx) => {
      // Si hay ofertas a contraofertar, actualizarlas
      if (validacion.ofertasAContraofertar.length > 0) {
        await tx.oferta.updateMany({
          where: {
            id: { in: validacion.ofertasAContraofertar },
            contratacionId: contract.id,
            estado: "PROPUESTA",
          },
          data: { estado: "CONTRAOFERTADA" },
        });
      }

      const created = await tx.oferta.create({
        data: {
          contratacionId: contract.id,
          remitenteId: user.id,
          monto,
          mensaje: mensaje || null,
          estado: "PROPUESTA",
        },
      });

      return created;
    });

    return Response.json(newOffer, { status: 201 });
  } catch (error) {
    console.error("POST /api/contrataciones/:contratacionId/ofertas error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

