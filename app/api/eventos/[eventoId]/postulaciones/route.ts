import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUser,
  uuidSchema,
  zodErrorResponse,
  errorResponse,
} from "@/lib/api-helpers";
import { validarCreacionPostulacion } from "@/lib/postulaciones";

interface RouteParams {
  params: Promise<{ eventoId: string }>;
}

const crearPostulacionBodySchema = z.object({
  proyectoMusicalId: z.string().uuid("ID de proyecto musical inválido"),
  mensaje: z.string().trim().max(1000).optional().or(z.literal("")),
  initialOfferAmount: z.number().min(0).optional(),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse("Autenticación requerida", 401);
    }

    if (user.rol !== "ORGANIZADOR") {
      return errorResponse("Solo los organizadores pueden consultar postulaciones recibidas", 403);
    }

    const { eventoId } = await params;
    const parsedId = uuidSchema.safeParse(eventoId);
    if (!parsedId.success) {
      return zodErrorResponse(parsedId.error);
    }

    const event = await prisma.evento.findUnique({
      where: { id: parsedId.data },
    });

    if (!event) {
      return errorResponse("Evento no encontrado", 404);
    }

    if (event.organizadorId !== user.id) {
      return errorResponse("No tienes permisos para ver las postulaciones de este evento", 403);
    }

    const postulaciones = await prisma.postulacion.findMany({
      where: { eventoId: parsedId.data },
      orderBy: { creadoEn: "desc" },
      include: {
        proyectoMusical: {
          select: {
            id: true,
            nombre: true,
            genero: true,
            imagenUrl: true,
          },
        },
        musico: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            fotoPerfilUrl: true,
          },
        },
        contratacion: {
          select: { id: true, estado: true },
        },
      },
    });

    return Response.json(postulaciones, { status: 200 });
  } catch (error) {
    console.error("GET /api/eventos/:eventoId/postulaciones error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse("Autenticación requerida", 401);
    }

    if (user.rol !== "MUSICO") {
      return errorResponse("Solo los músicos pueden postular proyectos", 403);
    }

    const { eventoId } = await params;
    const parsedEventId = uuidSchema.safeParse(eventoId);
    if (!parsedEventId.success) {
      return zodErrorResponse(parsedEventId.error);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Cuerpo de solicitud inválido", 400);
    }

    const parsedBody = crearPostulacionBodySchema.safeParse(body);
    if (!parsedBody.success) {
      return zodErrorResponse(parsedBody.error);
    }

    const { proyectoMusicalId, mensaje, initialOfferAmount } = parsedBody.data;

    // Obtener proyecto y evento
    const project = await prisma.proyectoMusical.findUnique({
      where: { id: proyectoMusicalId },
    });

    if (!project || project.usuarioId !== user.id) {
      return errorResponse("El proyecto musical no te pertenece", 403);
    }

    const event = await prisma.evento.findUnique({
      where: { id: parsedEventId.data },
    });

    if (!event) {
      return errorResponse("Evento no encontrado", 404);
    }

    const existing = await prisma.postulacion.findUnique({
      where: {
        eventoId_proyectoMusicalId: {
          eventoId: parsedEventId.data,
          proyectoMusicalId,
        },
      },
    });

    const ahora = new Date();
    const validacion = validarCreacionPostulacion({
      rolUsuario: user.rol,
      proyecto: {
        usuarioId: project.usuarioId,
        estaActivo: project.estaActivo,
      },
      evento: {
        estado: event.estado,
        startsAt: event.startsAt,
      },
      usuarioId: user.id,
      postulacionExistente: !!existing,
      ahora,
    });

    if (!validacion.ok) {
      switch (validacion.motivo) {
        case "ROL_NO_PERMITIDO":
          return errorResponse("Solo los músicos pueden postular proyectos", 403);
        case "PROYECTO_NO_PERTENECE_AL_USUARIO":
          return errorResponse("El proyecto musical no te pertenece", 403);
        case "PROYECTO_INACTIVO":
          return errorResponse("El proyecto musical no está activo", 409);
        case "EVENTO_NO_PUBLICADO":
          return errorResponse("El evento no está disponible para recibir postulaciones", 409);
        case "EVENTO_YA_COMENZO":
          return errorResponse("El evento ya no acepta postulaciones", 409);
        case "POSTULACION_DUPLICADA":
          return errorResponse("Ya existe una postulación para este proyecto en este evento", 409);
      }
    }

    let formattedMessage = mensaje?.trim() || null;
    if (initialOfferAmount && initialOfferAmount > 0) {
      formattedMessage = formattedMessage
        ? `${formattedMessage}\nOferta inicial solicitada: $${initialOfferAmount.toLocaleString("es-AR")}`
        : `Oferta inicial solicitada: $${initialOfferAmount.toLocaleString("es-AR")}`;
    }

    const postulacion = await prisma.postulacion.create({
      data: {
        eventoId: parsedEventId.data,
        proyectoMusicalId,
        musicoId: user.id,
        estado: "PENDIENTE",
        mensaje: formattedMessage,
      },
      include: {
        evento: {
          select: {
            id: true,
            titulo: true,
            startsAt: true,
            endsAt: true,
          },
        },
        proyectoMusical: {
          select: {
            id: true,
            nombre: true,
            genero: true,
          },
        },
      },
    });

    return Response.json(postulacion, { status: 201 });
  } catch (error) {
    console.error("POST /api/eventos/:eventoId/postulaciones error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

