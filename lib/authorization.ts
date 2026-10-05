import type { Prisma } from "@prisma/client";
import { AuthorizationError } from "@/lib/errors";
import type { RolUsuario, Usuario } from "@/lib/types";

/** Exige uno de los roles persistidos en Prisma para el usuario autenticado. */
export function requireRole<T extends Usuario>(
  usuario: T,
  allowedRoles: RolUsuario | readonly RolUsuario[]
): T {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!roles.includes(usuario.rol)) throw new AuthorizationError();
  return usuario;
}

/**
 * Filtros reutilizables para resolver ownership/participación en la consulta.
 * Si el recurso es ajeno, findFirst devuelve null y el caller debe responder 404.
 */
export function ownedProjectWhere(
  projectId: string,
  userId: string
): Prisma.ProyectoMusicalWhereInput {
  return { id: projectId, usuarioId: userId };
}

export function ownedEventWhere(
  eventId: string,
  userId: string
): Prisma.EventoWhereInput {
  return { id: eventId, organizadorId: userId };
}

export function participatingContractWhere(
  contractId: string,
  userId: string
): Prisma.ContratacionWhereInput {
  return {
    id: contractId,
    OR: [{ organizadorId: userId }, { musicoId: userId }],
  };
}

export function offerForCounterpartyWhere(
  offerId: string,
  userId: string
): Prisma.OfertaWhereInput {
  return {
    id: offerId,
    remitenteId: { not: userId },
    contratacion: {
      OR: [{ organizadorId: userId }, { musicoId: userId }],
    },
  };
}
