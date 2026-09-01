/**
 * Server Actions para Contrataciones, Ofertas y Negociaciones
 * 
 * @see docs/spec.md H4, H5, H6, H7
 * @see AGENTS.md § 7. ARQUITECTURA & § 10. AUTORIZACIÓN
 */

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/app/actions/auth";
import { crearOfertaSchema, type CrearOfertaInput } from "@/lib/validations/offers";
import { cancelarContratacionSchema, type CancelarContratacionInput } from "@/lib/validations/contracts";
import { normalizeError, AuthorizationError, NotFoundError, ValidationError, ConflictError } from "@/lib/errors";

/**
 * Postula un proyecto musical a un evento (Iniciado por Músico)
 */
export async function applyToEvent(
  eventoId: string,
  proyectoMusicalId: string,
  initialOfferAmount?: number,
  initialMessage?: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthorizationError("Debes iniciar sesión para postularte");
    }

    if (user.rol !== "MUSICO") {
      throw new AuthorizationError("Solo los músicos pueden postular proyectos a eventos");
    }

    // Verificar que el proyecto pertenezca al usuario
    const project = await prisma.proyectoMusical.findUnique({
      where: { id: proyectoMusicalId },
    });

    if (!project || project.usuarioId !== user.id) {
      throw new AuthorizationError("El proyecto musical no te pertenece");
    }

    // Verificar el evento
    const event = await prisma.evento.findUnique({
      where: { id: eventoId },
    });

    if (!event) {
      throw new NotFoundError("Evento");
    }

    if (event.estado !== "PUBLICADO") {
      throw new ValidationError("El evento no está disponible para recibir postulaciones");
    }

    // Verificar si ya existe una contratación/postulación
    const existingContract = await prisma.contratacion.findUnique({
      where: {
        eventoId_proyectoMusicalId: {
          eventoId,
          proyectoMusicalId,
        },
      },
    });

    if (existingContract) {
      throw new ConflictError("Ya existe una postulación o contratación para este proyecto en este evento");
    }

    // Crear la contratación en estado PENDIENTE o NEGOCIANDO
    const hasInitialOffer = initialOfferAmount !== undefined && initialOfferAmount > 0;

    const contract = await prisma.contratacion.create({
      data: {
        eventoId,
        proyectoMusicalId,
        organizadorId: event.organizadorId,
        musicoId: user.id,
        creadoPorId: user.id,
        estado: hasInitialOffer ? "NEGOCIANDO" : "PENDIENTE",
        ofertas: hasInitialOffer
          ? {
              create: {
                remitenteId: user.id,
                monto: initialOfferAmount,
                mensaje: initialMessage || null,
                estado: "PROPUESTA",
              },
            }
          : undefined,
      },
      include: {
        ofertas: true,
      },
    });

    revalidatePath("/dashboard/musician");
    revalidatePath(`/events/${eventoId}`);

    return {
      success: true,
      data: contract,
    };
  } catch (error) {
    const normalized = normalizeError(error);
    return {
      error: true,
      message: normalized.message,
      code: normalized.code,
    };
  }
}

/**
 * Invita un proyecto musical a un evento (Iniciado por Organizador)
 */
export async function inviteProject(
  eventoId: string,
  proyectoMusicalId: string,
  initialOfferAmount?: number,
  initialMessage?: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthorizationError("Debes iniciar sesión para invitar artistas");
    }

    if (user.rol !== "ORGANIZADOR") {
      throw new AuthorizationError("Solo los organizadores pueden invitar artistas a sus eventos");
    }

    // Verificar que el evento pertenezca al organizador
    const event = await prisma.evento.findUnique({
      where: { id: eventoId },
    });

    if (!event || event.organizadorId !== user.id) {
      throw new AuthorizationError("El evento no te pertenece");
    }

    // Verificar el proyecto
    const project = await prisma.proyectoMusical.findUnique({
      where: { id: proyectoMusicalId },
    });

    if (!project) {
      throw new NotFoundError("Proyecto musical");
    }

    // Verificar duplicado
    const existingContract = await prisma.contratacion.findUnique({
      where: {
        eventoId_proyectoMusicalId: {
          eventoId,
          proyectoMusicalId,
        },
      },
    });

    if (existingContract) {
      throw new ConflictError("Ya existe una postulación o contratación previa para este proyecto");
    }

    const hasInitialOffer = initialOfferAmount !== undefined && initialOfferAmount > 0;

    const contract = await prisma.contratacion.create({
      data: {
        eventoId,
        proyectoMusicalId,
        organizadorId: user.id,
        musicoId: project.usuarioId,
        creadoPorId: user.id,
        estado: hasInitialOffer ? "NEGOCIANDO" : "PENDIENTE",
        ofertas: hasInitialOffer
          ? {
              create: {
                remitenteId: user.id,
                monto: initialOfferAmount,
                mensaje: initialMessage || null,
                estado: "PROPUESTA",
              },
            }
          : undefined,
      },
      include: {
        ofertas: true,
      },
    });

    revalidatePath("/dashboard/organizer");

    return {
      success: true,
      data: contract,
    };
  } catch (error) {
    const normalized = normalizeError(error);
    return {
      error: true,
      message: normalized.message,
      code: normalized.code,
    };
  }
}

/**
 * Realiza una nueva oferta o contraoferta económica
 */
export async function createOffer(input: CrearOfertaInput) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthorizationError("No autenticado");
    }

    const validated = crearOfertaSchema.parse(input);

    const contract = await prisma.contratacion.findUnique({
      where: { id: validated.contratacionId },
      include: {
        ofertas: {
          where: { estado: "PROPUESTA" },
        },
      },
    });

    if (!contract) {
      throw new NotFoundError("Contratación");
    }

    // Verificar que sea participante
    if (contract.organizadorId !== user.id && contract.musicoId !== user.id) {
      throw new AuthorizationError("No tienes acceso a esta negociación");
    }

    // Verificar estado válido del contrato
    if (["ACORDADO", "CANCELADO", "COMPLETADO", "RECHAZADO"].includes(contract.estado)) {
      throw new ValidationError(`No se pueden enviar ofertas en una contratación con estado ${contract.estado}`);
    }

    // Marcar propuestas previas vigentes como CONTRAOFERTADA
    await prisma.oferta.updateMany({
      where: {
        contratacionId: contract.id,
        estado: "PROPUESTA",
      },
      data: {
        estado: "CONTRAOFERTADA",
      },
    });

    // Crear la nueva oferta y actualizar estado del contrato a NEGOCIANDO
    const [newOffer] = await prisma.$transaction([
      prisma.oferta.create({
        data: {
          contratacionId: contract.id,
          remitenteId: user.id,
          monto: validated.monto,
          mensaje: validated.mensaje || null,
          estado: "PROPUESTA",
        },
      }),
      prisma.contratacion.update({
        where: { id: contract.id },
        data: {
          estado: "NEGOCIANDO",
        },
      }),
    ]);

    revalidatePath(`/dashboard`);
    revalidatePath(`/contracts/${contract.id}`);

    return {
      success: true,
      data: newOffer,
    };
  } catch (error) {
    const normalized = normalizeError(error);
    return {
      error: true,
      message: normalized.message,
      code: normalized.code,
    };
  }
}

/**
 * Acepta la oferta vigente y formaliza el acuerdo
 */
export async function acceptOffer(ofertaId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthorizationError("No autenticado");
    }

    const offer = await prisma.oferta.findUnique({
      where: { id: ofertaId },
      include: { contratacion: true },
    });

    if (!offer) {
      throw new NotFoundError("Oferta");
    }

    const contract = offer.contratacion;

    // Solo la contraparte puede aceptar (no el que envió la oferta)
    if (offer.remitenteId === user.id) {
      throw new ValidationError("No puedes aceptar tu propia oferta");
    }

    if (contract.organizadorId !== user.id && contract.musicoId !== user.id) {
      throw new AuthorizationError("No formas parte de esta negociación");
    }

    if (offer.estado !== "PROPUESTA") {
      throw new ValidationError("Esta oferta ya no está disponible para ser aceptada");
    }

    if (["ACORDADO", "CANCELADO", "COMPLETADO", "RECHAZADO"].includes(contract.estado)) {
      throw new ValidationError(`La contratación ya se encuentra en estado ${contract.estado}`);
    }

    // Transacción atómica: marcar oferta como ACEPTADA y contrato como ACORDADO
    const [updatedOffer, updatedContract] = await prisma.$transaction([
      prisma.oferta.update({
        where: { id: offer.id },
        data: { estado: "ACEPTADA" },
      }),
      prisma.contratacion.update({
        where: { id: contract.id },
        data: {
          estado: "ACORDADO",
          montoPactado: offer.monto,
          fechaAcuerdo: new Date(),
        },
      }),
    ]);

    revalidatePath("/dashboard/musician");
    revalidatePath("/dashboard/organizer");
    revalidatePath(`/contracts/${contract.id}`);

    return {
      success: true,
      data: {
        offer: updatedOffer,
        contract: updatedContract,
      },
    };
  } catch (error) {
    const normalized = normalizeError(error);
    return {
      error: true,
      message: normalized.message,
      code: normalized.code,
    };
  }
}

/**
 * Rechaza una oferta
 */
export async function rejectOffer(ofertaId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthorizationError("No autenticado");
    }

    const offer = await prisma.oferta.findUnique({
      where: { id: ofertaId },
      include: { contratacion: true },
    });

    if (!offer) {
      throw new NotFoundError("Oferta");
    }

    if (offer.remitenteId === user.id) {
      throw new ValidationError("No puedes rechazar tu propia oferta");
    }

    const contract = offer.contratacion;
    if (contract.organizadorId !== user.id && contract.musicoId !== user.id) {
      throw new AuthorizationError("No tienes acceso a esta negociación");
    }

    const updated = await prisma.oferta.update({
      where: { id: ofertaId },
      data: { estado: "RECHAZADA" },
    });

    revalidatePath(`/contracts/${contract.id}`);

    return {
      success: true,
      data: updated,
    };
  } catch (error) {
    const normalized = normalizeError(error);
    return {
      error: true,
      message: normalized.message,
      code: normalized.code,
    };
  }
}

/**
 * Cancela una contratación con motivo
 */
export async function cancelContract(input: CancelarContratacionInput) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthorizationError("No autenticado");
    }

    const validated = cancelarContratacionSchema.parse(input);

    const contract = await prisma.contratacion.findUnique({
      where: { id: validated.contratacionId },
    });

    if (!contract) {
      throw new NotFoundError("Contratación");
    }

    if (contract.organizadorId !== user.id && contract.musicoId !== user.id) {
      throw new AuthorizationError("No tienes permiso para cancelar esta contratación");
    }

    if (contract.estado === "CANCELADO" || contract.estado === "COMPLETADO") {
      throw new ValidationError(`La contratación ya está ${contract.estado}`);
    }

    const updated = await prisma.contratacion.update({
      where: { id: contract.id },
      data: {
        estado: "CANCELADO",
        fechaCancelacion: new Date(),
        motivoCancelacion: validated.motivoCancelacion,
      },
    });

    revalidatePath("/dashboard/musician");
    revalidatePath("/dashboard/organizer");

    return {
      success: true,
      data: updated,
    };
  } catch (error) {
    const normalized = normalizeError(error);
    return {
      error: true,
      message: normalized.message,
      code: normalized.code,
    };
  }
}

/**
 * Obtiene las contrataciones del usuario autenticado (músico u organizador)
 */
export async function getMyContracts() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return [];
    }

    const contracts = await prisma.contratacion.findMany({
      where: {
        OR: [
          { musicoId: user.id },
          { organizadorId: user.id },
        ],
      },
      orderBy: { actualizadoEn: "desc" },
      include: {
        evento: {
          select: {
            id: true,
            titulo: true,
            fechaEvento: true,
            ubicacion: true,
            estado: true,
          },
        },
        proyectoMusical: {
          select: {
            id: true,
            nombre: true,
            genero: true,
            imagenUrl: true,
          },
        },
        organizador: {
          select: {
            nombre: true,
            apellido: true,
          },
        },
        musico: {
          select: {
            nombre: true,
            apellido: true,
          },
        },
        ofertas: {
          orderBy: { creadoEn: "desc" },
          take: 1,
        },
      },
    });

    return contracts;
  } catch (error) {
    console.warn("Could not fetch my contracts:", (error as Error).message);
    return [];
  }
}

/**
 * Obtiene el detalle completo de una contratación con su historial de ofertas
 */
export async function getContractById(contratacionId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return null;
    }

    const contract = await prisma.contratacion.findUnique({
      where: { id: contratacionId },
      include: {
        evento: true,
        proyectoMusical: true,
        organizador: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
        musico: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
        ofertas: {
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
        },
        valoraciones: true,
      },
    });

    if (!contract) return null;

    // Verificar pertenencia
    if (contract.organizadorId !== user.id && contract.musicoId !== user.id) {
      return null;
    }

    return contract;
  } catch (error) {
    console.warn("Could not fetch contract by ID:", (error as Error).message);
    return null;
  }
}