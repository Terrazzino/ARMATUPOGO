import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUser,
  uuidSchema,
  zodErrorResponse,
  errorResponse,
} from "@/lib/api-helpers";
import { validarAceptacionPostulacion } from "@/lib/postulaciones";
import { validarDisponibilidadMusico } from "@/lib/disponibilidad";

interface RouteParams {
  params: Promise<{ postulacionId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse("Autenticación requerida", 401);
    }

    if (user.rol !== "ORGANIZADOR") {
      return errorResponse("Solo los organizadores pueden aceptar postulaciones", 403);
    }

    const { postulacionId } = await params;
    const parsedId = uuidSchema.safeParse(postulacionId);
    if (!parsedId.success) {
      return zodErrorResponse(parsedId.error);
    }

    const postulacion = await prisma.postulacion.findUnique({
      where: { id: parsedId.data },
      include: {
        evento: true,
        proyectoMusical: true,
      },
    });

    if (!postulacion) {
      return errorResponse("Postulación no encontrada", 404);
    }

    if (postulacion.evento.organizadorId !== user.id) {
      return errorResponse("No puedes aceptar postulaciones de otro organizador", 403);
    }

    // Verificar si ya existe contratación para este proyecto en este evento
    const existingContract = await prisma.contratacion.findUnique({
      where: {
        eventoId_proyectoMusicalId: {
          eventoId: postulacion.eventoId,
          proyectoMusicalId: postulacion.proyectoMusicalId,
        },
      },
    });

    const validacion = validarAceptacionPostulacion({
      postulacion: { estado: postulacion.estado },
      evento: {
        organizadorId: postulacion.evento.organizadorId,
        estado: postulacion.evento.estado,
      },
      usuarioId: user.id,
      contratacionExistente: !!existingContract,
    });

    if (!validacion.ok) {
      switch (validacion.motivo) {
        case "USUARIO_NO_ORGANIZADOR":
          return errorResponse("No puedes aceptar postulaciones de otro organizador", 403);
        case "POSTULACION_NO_PENDIENTE":
          return errorResponse("La postulación ya no está pendiente", 409);
        case "EVENTO_NO_PUBLICADO":
          return errorResponse("El evento ya no admite postulaciones", 409);
        case "CONTRATACION_DUPLICADA":
          return errorResponse("Ya existe una contratación para este proyecto en este evento", 409);
      }
    }

    // Validar disponibilidad horaria del músico
    const contratosMusico = await prisma.contratacion.findMany({
      where: {
        musicoId: postulacion.proyectoMusical.usuarioId,
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
        startsAt: postulacion.evento.startsAt,
        endsAt: postulacion.evento.endsAt,
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

    // Transacción atómica (§ 25 spec)
    const { updatedPostulacion, createdContract } = await prisma.$transaction(
      async (tx) => {
        // 1. Reclamar la postulación
        const claimed = await tx.postulacion.updateMany({
          where: {
            id: parsedId.data,
            estado: "PENDIENTE",
          },
          data: { estado: "ACEPTADA" },
        });

        if (claimed.count !== 1) {
          throw new Error("POSTULACION_YA_PROCESADA");
        }

        // 2. Cancelar automáticamente otras postulaciones PENDIENTES del mismo músico para este evento
        await tx.postulacion.updateMany({
          where: {
            id: { not: parsedId.data },
            eventoId: postulacion.eventoId,
            musicoId: postulacion.proyectoMusical.usuarioId,
            estado: "PENDIENTE",
          },
          data: { estado: "CANCELADA" },
        });

        // 3. Crear contratación NEGOCIANDO
        const createdContract = await tx.contratacion.create({
          data: {
            eventoId: postulacion.eventoId,
            proyectoMusicalId: postulacion.proyectoMusicalId,
            postulacionId: postulacion.id,
            organizadorId: postulacion.evento.organizadorId,
            musicoId: postulacion.proyectoMusical.usuarioId,
            creadoPorId: user.id,
            estado: "NEGOCIANDO",
          },
        });

        const updatedPostulacion = await tx.postulacion.findUniqueOrThrow({
          where: { id: parsedId.data },
        });

        return { updatedPostulacion, createdContract };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return Response.json(
      {
        postulacion: updatedPostulacion,
        contratacion: createdContract,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "POSTULACION_YA_PROCESADA") {
      return errorResponse("La postulación ya fue procesada por otra operación", 409);
    }
    console.error("POST /api/postulaciones/:postulacionId/aceptar error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

