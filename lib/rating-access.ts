import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { participatingContractWhere } from "@/lib/authorization";
import { calcularReputacion, validarCreacionValoracion } from "@/lib/valoraciones";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";

const publicRatingSelect = {
  id: true,
  puntaje: true,
  comentario: true,
  creadoEn: true,
  autor: {
    select: {
      id: true,
      nombre: true,
      apellido: true,
      fotoPerfilUrl: true,
    },
  },
} satisfies Prisma.ValoracionSelect;

const participantRatingSelect = {
  id: true,
  contratacionId: true,
  autorId: true,
  destinatarioId: true,
  proyectoDestinatarioId: true,
  puntaje: true,
  comentario: true,
  creadoEn: true,
  actualizadoEn: true,
  autor: { select: publicRatingSelect.autor.select },
} satisfies Prisma.ValoracionSelect;

function reputationFrom<T extends { puntaje: number }>(ratings: T[]) {
  const reputation = calcularReputacion(ratings);
  return {
    total: reputation.total,
    promedio: reputation.promedio,
    valoraciones: ratings,
  };
}

export async function getRatingsForParticipant(
  contractId: string,
  userId: string
) {
  const contract = await prisma.contratacion.findFirst({
    where: participatingContractWhere(contractId, userId),
    select: {
      valoraciones: {
        orderBy: { creadoEn: "desc" },
        select: participantRatingSelect,
      },
    },
  });
  if (!contract) throw new NotFoundError("Contratación");
  return contract.valoraciones;
}

export async function createRatingForParticipant(input: {
  contractId: string;
  userId: string;
  score: number;
  comment?: string;
}) {
  const contract = await prisma.contratacion.findFirst({
    where: participatingContractWhere(input.contractId, input.userId),
    select: {
      id: true,
      organizadorId: true,
      musicoId: true,
      proyectoMusicalId: true,
      estado: true,
      valoraciones: {
        where: { autorId: input.userId },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!contract) throw new NotFoundError("Contratación");

  const validation = validarCreacionValoracion({
    contratacion: contract,
    usuarioId: input.userId,
    valoracionPreviaExiste: contract.valoraciones.length > 0,
    puntaje: input.score,
  });

  if (!validation.ok) {
    switch (validation.motivo) {
      case "CONTRATACION_NO_COMPLETADA":
        throw new ConflictError(
          "Solo se pueden valorar contrataciones completadas"
        );
      case "VALORACION_DUPLICADA":
        throw new ConflictError(
          "Ya realizaste una valoración para esta contratación"
        );
      case "PUNTAJE_INVALIDO":
        throw new ValidationError("Datos inválidos");
      case "USUARIO_NO_PARTICIPANTE":
        throw new NotFoundError("Contratación");
    }
  }

  try {
    return await prisma.valoracion.create({
      data: {
        contratacionId: contract.id,
        autorId: input.userId,
        destinatarioId: validation.destinatarioId,
        proyectoDestinatarioId: validation.proyectoDestinatarioId,
        puntaje: input.score,
        comentario: input.comment || null,
      },
      select: participantRatingSelect,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictError(
        "Ya realizaste una valoración para esta contratación"
      );
    }
    throw error;
  }
}

export async function getPublicUserReputation(userId: string) {
  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    select: {
      valoracionesRecibidas: {
        orderBy: { creadoEn: "desc" },
        select: publicRatingSelect,
      },
    },
  });
  if (!user) throw new NotFoundError("Usuario");
  return reputationFrom(user.valoracionesRecibidas);
}

export async function getPublicProjectReputation(projectId: string) {
  const project = await prisma.proyectoMusical.findFirst({
    where: { id: projectId, estaActivo: true },
    select: {
      valoraciones: {
        orderBy: { creadoEn: "desc" },
        select: publicRatingSelect,
      },
    },
  });
  if (!project) throw new NotFoundError("Proyecto musical");
  return reputationFrom(project.valoraciones);
}
