import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { participatingContractWhere } from "@/lib/authorization";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import {
  validarAceptacionOferta,
  validarCreacionOferta,
  validarRechazoOferta,
} from "@/lib/ofertas";
import { validarDisponibilidadMusico } from "@/lib/disponibilidad";
import { validarDisponibilidadCupo } from "@/lib/cupos";

const offerSenderSelect = {
  id: true,
  nombre: true,
  apellido: true,
  rol: true,
} satisfies Prisma.UsuarioSelect;

function accessibleOfferWhere(
  offerId: string,
  userId: string
): Prisma.OfertaWhereInput {
  return {
    id: offerId,
    contratacion: {
      OR: [{ organizadorId: userId }, { musicoId: userId }],
    },
  };
}

function domainOffer(offer: {
  id: string;
  remitenteId: string;
  monto: Prisma.Decimal;
  estado: "PROPUESTA" | "ACEPTADA" | "RECHAZADA" | "CONTRAOFERTADA";
}) {
  return {
    id: offer.id,
    remitenteId: offer.remitenteId,
    monto: Number(offer.monto),
    estado: offer.estado,
  };
}

export async function getOffersForParticipant(
  contractId: string,
  userId: string
) {
  const contract = await prisma.contratacion.findFirst({
    where: participatingContractWhere(contractId, userId),
    select: {
      ofertas: {
        orderBy: { creadoEn: "asc" },
        include: { remitente: { select: offerSenderSelect } },
      },
    },
  });
  if (!contract) throw new NotFoundError("Contratación");
  return contract.ofertas;
}

export async function createOfferForParticipant(input: {
  contractId: string;
  userId: string;
  amount: number;
  message?: string;
}) {
  const contract = await prisma.contratacion.findFirst({
    where: participatingContractWhere(input.contractId, input.userId),
    include: {
      ofertas: {
        select: { id: true, remitenteId: true, monto: true, estado: true },
      },
    },
  });
  if (!contract) throw new NotFoundError("Contratación");

  const validation = validarCreacionOferta({
    contratacion: contract,
    usuarioId: input.userId,
    monto: input.amount,
    ofertasExistentes: contract.ofertas.map(domainOffer),
  });

  if (!validation.ok) {
    switch (validation.motivo) {
      case "CONTRATACION_NO_NEGOCIANDO":
        throw new ConflictError(
          "No se pueden enviar ofertas en una contratación cerrada"
        );
      case "MONTO_INVALIDO":
        throw new ValidationError("Datos inválidos");
      case "USUARIO_NO_PARTICIPANTE":
        throw new NotFoundError("Contratación");
    }
  }

  return prisma.$transaction(async (tx) => {
    if (validation.ofertasAContraofertar.length > 0) {
      await tx.oferta.updateMany({
        where: {
          id: { in: validation.ofertasAContraofertar },
          contratacionId: contract.id,
          estado: "PROPUESTA",
        },
        data: { estado: "CONTRAOFERTADA" },
      });
    }

    return tx.oferta.create({
      data: {
        contratacionId: contract.id,
        remitenteId: input.userId,
        monto: input.amount,
        mensaje: input.message || null,
        estado: "PROPUESTA",
      },
    });
  });
}

export async function acceptOfferAsCounterparty(
  offerId: string,
  userId: string
) {
  const offer = await prisma.oferta.findFirst({
    where: accessibleOfferWhere(offerId, userId),
    include: {
      contratacion: {
        include: {
          evento: {
            include: {
              contrataciones: { select: { id: true, estado: true } },
            },
          },
          ofertas: {
            select: { id: true, remitenteId: true, monto: true, estado: true },
          },
        },
      },
    },
  });
  if (!offer) throw new NotFoundError("Oferta");

  const contract = offer.contratacion;
  const validation = validarAceptacionOferta({
    oferta: domainOffer(offer),
    contratacion: contract,
    usuarioId: userId,
    todasLasOfertas: contract.ofertas.map(domainOffer),
  });

  if (!validation.ok) {
    switch (validation.motivo) {
      case "EMISOR_NO_PUEDE_ACEPTAR_PROPIA_OFERTA":
        throw new ConflictError("No puedes aceptar tu propia oferta");
      case "OFERTA_NO_PROPUESTA":
        throw new ConflictError("Esta oferta ya no está disponible");
      case "CONTRATACION_NO_NEGOCIANDO":
        throw new ConflictError("La contratación ya no está en negociación");
      case "USUARIO_NO_PARTICIPANTE":
        throw new NotFoundError("Oferta");
    }
  }

  const activeContracts = await prisma.contratacion.findMany({
    where: {
      musicoId: contract.musicoId,
      estado: { in: ["NEGOCIANDO", "ACORDADO"] },
    },
    include: {
      evento: {
        select: { titulo: true, startsAt: true, endsAt: true },
      },
    },
  });

  const availability = validarDisponibilidadMusico({
    nuevoEvento: {
      startsAt: contract.evento.startsAt,
      endsAt: contract.evento.endsAt,
    },
    contratacionesExistentes: activeContracts,
    contratacionActualIdIgnorar: contract.id,
  });
  if (!availability.ok) {
    throw new ConflictError("El músico no está disponible en ese horario");
  }

  const capacity = validarDisponibilidadCupo({
    cantidadRequerida: contract.evento.cantidadMusicosRequerida,
    contrataciones: contract.evento.contrataciones,
  });
  if (!capacity.ok) {
    throw new ConflictError("El evento no tiene cupos disponibles");
  }

  const now = new Date();
  return prisma.$transaction(
    async (tx) => {
      const contractUpdate = await tx.contratacion.updateMany({
        where: { id: contract.id, estado: "NEGOCIANDO" },
        data: {
          estado: "ACORDADO",
          montoPactado: offer.monto,
          fechaAcuerdo: now,
        },
      });
      if (contractUpdate.count !== 1) {
        throw new ConflictError(
          "La contratación ya fue acordada por otra operación"
        );
      }

      const offerUpdate = await tx.oferta.updateMany({
        where: {
          id: offer.id,
          contratacionId: contract.id,
          estado: "PROPUESTA",
        },
        data: { estado: "ACEPTADA" },
      });
      if (offerUpdate.count !== 1) {
        throw new ConflictError("Esta oferta ya no está disponible");
      }

      if (validation.ofertasAContraofertar.length > 0) {
        await tx.oferta.updateMany({
          where: {
            id: { in: validation.ofertasAContraofertar },
            contratacionId: contract.id,
            estado: "PROPUESTA",
          },
          data: { estado: "CONTRAOFERTADA" },
        });
      }

      const updatedOffer = await tx.oferta.findUniqueOrThrow({
        where: { id: offer.id },
      });
      const updatedContract = await tx.contratacion.findUniqueOrThrow({
        where: { id: contract.id },
        include: { evento: true, proyectoMusical: true },
      });
      return { updatedOffer, updatedContract };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export async function rejectOfferAsCounterparty(
  offerId: string,
  userId: string
) {
  const offer = await prisma.oferta.findFirst({
    where: accessibleOfferWhere(offerId, userId),
    include: { contratacion: true },
  });
  if (!offer) throw new NotFoundError("Oferta");

  const validation = validarRechazoOferta({
    oferta: domainOffer(offer),
    contratacion: offer.contratacion,
    usuarioId: userId,
  });

  if (!validation.ok) {
    switch (validation.motivo) {
      case "EMISOR_NO_PUEDE_RECHAZAR_PROPIA_OFERTA":
        throw new ConflictError("No puedes rechazar tu propia oferta");
      case "OFERTA_NO_PROPUESTA":
        throw new ConflictError("Solo se pueden rechazar ofertas vigentes");
      case "CONTRATACION_NO_NEGOCIANDO":
        throw new ConflictError(
          "No se pueden rechazar ofertas en una contratación cerrada"
        );
      case "USUARIO_NO_PARTICIPANTE":
        throw new NotFoundError("Oferta");
    }
  }

  const result = await prisma.oferta.updateMany({
    where: {
      id: offer.id,
      contratacionId: offer.contratacionId,
      estado: "PROPUESTA",
      contratacion: { estado: "NEGOCIANDO" },
    },
    data: { estado: "RECHAZADA" },
  });
  if (result.count !== 1) {
    throw new ConflictError("La oferta ya no está disponible para ser rechazada");
  }

  return prisma.oferta.findUniqueOrThrow({ where: { id: offer.id } });
}
