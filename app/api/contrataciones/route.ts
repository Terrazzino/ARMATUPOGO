import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUser,
  zodErrorResponse,
  errorResponse,
} from "@/lib/api-helpers";
import { validarDisponibilidadMusico } from "@/lib/disponibilidad";

const crearContratacionDirectaSchema = z.object({
  eventoId: z.string().uuid("ID de evento inválido"),
  proyectoMusicalId: z.string().uuid("ID de proyecto musical inválido"),
  initialOfferAmount: z.number().min(0, "El monto no puede ser negativo").optional(),
  initialMessage: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse("Autenticación requerida", 401);
    }

    const contracts = await prisma.contratacion.findMany({
      where: {
        OR: [{ musicoId: user.id }, { organizadorId: user.id }],
      },
      orderBy: { actualizadoEn: "desc" },
      include: {
        evento: {
          select: {
            id: true,
            titulo: true,
            startsAt: true,
            endsAt: true,
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
            id: true,
            nombre: true,
            apellido: true,
          },
        },
        musico: {
          select: {
            id: true,
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

    return Response.json(contracts, { status: 200 });
  } catch (error) {
    console.error("GET /api/contrataciones error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse("Autenticación requerida", 401);
    }

    if (user.rol !== "ORGANIZADOR") {
      return errorResponse("Solo los organizadores pueden iniciar contrataciones directas", 403);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Cuerpo de solicitud inválido", 400);
    }

    const parsed = crearContratacionDirectaSchema.safeParse(body);
    if (!parsed.success) {
      return zodErrorResponse(parsed.error);
    }

    const { eventoId, proyectoMusicalId, initialOfferAmount, initialMessage } = parsed.data;

    const event = await prisma.evento.findUnique({
      where: { id: eventoId },
    });

    if (!event || event.organizadorId !== user.id) {
      return errorResponse("El evento no te pertenece", 403);
    }

    const project = await prisma.proyectoMusical.findUnique({
      where: { id: proyectoMusicalId },
    });

    if (!project) {
      return errorResponse("Proyecto musical no encontrado", 404);
    }

    if (!project.estaActivo) {
      return errorResponse("El proyecto musical no está activo", 409);
    }

    // Verificar postulaciones o contrataciones previas
    const existingPostulation = await prisma.postulacion.findUnique({
      where: {
        eventoId_proyectoMusicalId: {
          eventoId,
          proyectoMusicalId,
        },
      },
    });

    const existingContract = await prisma.contratacion.findUnique({
      where: {
        eventoId_proyectoMusicalId: {
          eventoId,
          proyectoMusicalId,
        },
      },
    });

    if (existingPostulation || existingContract) {
      return errorResponse(
        "Ya existe una postulación o contratación previa para este proyecto en este evento",
        409
      );
    }

    // Validar disponibilidad horaria del músico
    const contratosMusico = await prisma.contratacion.findMany({
      where: {
        musicoId: project.usuarioId,
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
    });

    if (!validacionDisponibilidad.ok) {
      return errorResponse(
        "El músico no está disponible en ese horario",
        409,
        { conflictos: validacionDisponibilidad.conflictos }
      );
    }

    const hasInitialOffer = initialOfferAmount !== undefined && initialOfferAmount > 0;

    const contract = await prisma.contratacion.create({
      data: {
        eventoId,
        proyectoMusicalId,
        organizadorId: user.id,
        musicoId: project.usuarioId,
        creadoPorId: user.id,
        estado: "NEGOCIANDO",
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
        evento: true,
        proyectoMusical: true,
        ofertas: true,
      },
    });

    return Response.json(contract, { status: 201 });
  } catch (error) {
    console.error("POST /api/contrataciones error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

