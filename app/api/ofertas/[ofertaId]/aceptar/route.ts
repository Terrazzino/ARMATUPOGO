import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUser,
  uuidSchema,
  zodErrorResponse,
  errorResponse,
} from "@/lib/api-helpers";
import { validarAceptacionOferta } from "@/lib/ofertas";
import { validarDisponibilidadMusico } from "@/lib/disponibilidad";
import { validarDisponibilidadCupo } from "@/lib/cupos";

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
      include: {
        contratacion: {
          include: {
            evento: {
              include: {
                contrataciones: {
                  select: { id: true, estado: true },
                },
              },
            },
            ofertas: {
              select: {
                id: true,
                remitenteId: true,
                monto: true,
                estado: true,
              },
            },
          },
        },
      },
    });

    if (!offer) {
      return errorResponse("Oferta no encontrada", 404);
    }

    const contract = offer.contratacion;
    const event = contract.evento;

    const ofertasParaDominio = contract.ofertas.map((o) => ({
      id: o.id,
      remitenteId: o.remitenteId,
      monto: Number(o.monto),
      estado: o.estado,
    }));

    // 1. Validar reglas de oferta
    const validacionOferta = validarAceptacionOferta({
      oferta: {
        id: offer.id,
        remitenteId: offer.remitenteId,
        monto: Number(offer.monto),
        estado: offer.estado,
      },
      contratacion: {
        id: contract.id,
        organizadorId: contract.organizadorId,
        musicoId: contract.musicoId,
        estado: contract.estado,
      },
      usuarioId: user.id,
      todasLasOfertas: ofertasParaDominio,
    });

    if (!validacionOferta.ok) {
      switch (validacionOferta.motivo) {
        case "USUARIO_NO_PARTICIPANTE":
          return errorResponse("No formas parte de esta negociación", 403);
        case "EMISOR_NO_PUEDE_ACEPTAR_PROPIA_OFERTA":
          return errorResponse("No puedes aceptar tu propia oferta", 409);
        case "OFERTA_NO_PROPUESTA":
          return errorResponse("Esta oferta ya no está disponible", 409);
        case "CONTRATACION_NO_NEGOCIANDO":
          return errorResponse("La contratación ya no está en negociación", 409);
      }
    }

    // 2. Validar disponibilidad del músico (H9, § 8, § 25 spec)
    const contratosMusico = await prisma.contratacion.findMany({
      where: {
        musicoId: contract.musicoId,
        estado: { in: ["NEGOCIANDO", "ACORDADO"] },
      },
      include: {
        evento: {
          select: {
            titulo: true,
            startsAt: true,
            endsAt: true,
          },
        },
      },
    });

    const validacionDisponibilidad = validarDisponibilidadMusico({
      nuevoEvento: {
        startsAt: event.startsAt,
        endsAt: event.endsAt,
      },
      contratacionesExistentes: contratosMusico,
      contratacionActualIdIgnorar: contract.id,
    });

    if (!validacionDisponibilidad.ok) {
      return errorResponse(
        "El músico no está disponible en ese horario",
        409,
        { conflictos: validacionDisponibilidad.conflictos }
      );
    }

    // 3. Validar cupos del evento (H9, § 9, § 25 spec)
    const validacionCupo = validarDisponibilidadCupo({
      cantidadRequerida: event.cantidadMusicosRequerida,
      contrataciones: event.contrataciones,
    });

    if (!validacionCupo.ok) {
      return errorResponse(
        "El evento no tiene cupos disponibles",
        409,
        {
          cuposOcupados: validacionCupo.cuposOcupados,
          cuposTotales: validacionCupo.cuposTotales,
        }
      );
    }

    const ahora = new Date();

    // 4. Transacción atómica (§ 25 spec)
    const { updatedOffer, updatedContract } = await prisma.$transaction(
      async (tx) => {
        // Reclamar contrato en NEGOCIANDO
        const contractUpdate = await tx.contratacion.updateMany({
          where: {
            id: contract.id,
            estado: "NEGOCIANDO",
          },
          data: {
            estado: "ACORDADO",
            montoPactado: offer.monto,
            fechaAcuerdo: ahora,
          },
        });

        if (contractUpdate.count !== 1) {
          throw new Error("CONTRATO_MODIFICADO_CONCURRENTEMENTE");
        }

        // Reclamar oferta en PROPUESTA
        const offerUpdate = await tx.oferta.updateMany({
          where: {
            id: offer.id,
            contratacionId: contract.id,
            estado: "PROPUESTA",
          },
          data: { estado: "ACEPTADA" },
        });

        if (offerUpdate.count !== 1) {
          throw new Error("OFERTA_MODIFICADA_CONCURRENTEMENTE");
        }

        // Otras ofertas pasan a CONTRAOFERTADA
        if (validacionOferta.ofertasAContraofertar.length > 0) {
          await tx.oferta.updateMany({
            where: {
              id: { in: validacionOferta.ofertasAContraofertar },
              contratacionId: contract.id,
              estado: "PROPUESTA",
            },
            data: { estado: "CONTRAOFERTADA" },
          });
        }

        const updatedOffer = await tx.oferta.findUniqueOrThrow({ where: { id: offer.id } });
        const updatedContract = await tx.contratacion.findUniqueOrThrow({
          where: { id: contract.id },
          include: { evento: true, proyectoMusical: true },
        });

        return { updatedOffer, updatedContract };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return Response.json(
      {
        offer: updatedOffer,
        contract: updatedContract,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "CONTRATO_MODIFICADO_CONCURRENTEMENTE") {
        return errorResponse("La contratación ya fue acordada por otra operación", 409);
      }
      if (error.message === "OFERTA_MODIFICADA_CONCURRENTEMENTE") {
        return errorResponse("Esta oferta ya no está disponible", 409);
      }
    }
    console.error("POST /api/ofertas/:ofertaId/aceptar error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

