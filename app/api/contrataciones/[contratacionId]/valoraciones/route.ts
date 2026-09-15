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
import { validarCreacionValoracion } from "@/lib/valoraciones";

interface RouteParams {
  params: Promise<{ contratacionId: string }>;
}

const crearValoracionBodySchema = z.object({
  puntaje: z
    .number()
    .int("El puntaje debe ser un número entero")
    .min(
      VALIDATION_LIMITS.RATING_MIN_SCORE,
      `El puntaje mínimo es ${VALIDATION_LIMITS.RATING_MIN_SCORE}`
    )
    .max(
      VALIDATION_LIMITS.RATING_MAX_SCORE,
      `El puntaje máximo es ${VALIDATION_LIMITS.RATING_MAX_SCORE}`
    ),
  comentario: z
    .string()
    .trim()
    .max(
      VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH,
      `El comentario no puede superar los ${VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH} caracteres`
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

    const ratings = await prisma.valoracion.findMany({
      where: { contratacionId: parsedId.data },
      include: {
        autor: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            fotoPerfilUrl: true,
          },
        },
      },
    });

    return Response.json(ratings, { status: 200 });
  } catch (error) {
    console.error("GET /api/contrataciones/:contratacionId/valoraciones error:", error);
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

    const parsedBody = crearValoracionBodySchema.safeParse(body);
    if (!parsedBody.success) {
      return zodErrorResponse(parsedBody.error);
    }

    const { puntaje, comentario } = parsedBody.data;

    const contract = await prisma.contratacion.findUnique({
      where: { id: parsedContractId.data },
    });

    if (!contract) {
      return errorResponse("Contratación no encontrada", 404);
    }

    const existingRating = await prisma.valoracion.findUnique({
      where: {
        contratacionId_autorId: {
          contratacionId: contract.id,
          autorId: user.id,
        },
      },
    });

    const validacion = validarCreacionValoracion({
      contratacion: {
        id: contract.id,
        organizadorId: contract.organizadorId,
        musicoId: contract.musicoId,
        proyectoMusicalId: contract.proyectoMusicalId,
        estado: contract.estado,
      },
      usuarioId: user.id,
      valoracionPreviaExiste: !!existingRating,
      puntaje,
    });

    if (!validacion.ok) {
      switch (validacion.motivo) {
        case "CONTRATACION_NO_COMPLETADA":
          return errorResponse(
            "Solo se pueden valorar contrataciones completadas",
            409
          );
        case "USUARIO_NO_PARTICIPANTE":
          return errorResponse("No participaste de esta contratación", 403);
        case "VALORACION_DUPLICADA":
          return errorResponse(
            "Ya realizaste una valoración para esta contratación",
            409
          );
        case "PUNTAJE_INVALIDO":
          return errorResponse("Datos inválidos", 400);
      }
    }

    const rating = await prisma.valoracion.create({
      data: {
        contratacionId: contract.id,
        autorId: user.id,
        destinatarioId: validacion.destinatarioId,
        proyectoDestinatarioId: validacion.proyectoDestinatarioId,
        puntaje,
        comentario: comentario || null,
      },
      include: {
        autor: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            fotoPerfilUrl: true,
          },
        },
      },
    });

    return Response.json(rating, { status: 201 });
  } catch (error) {
    console.error("POST /api/contrataciones/:contratacionId/valoraciones error:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}

