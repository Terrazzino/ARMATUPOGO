import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  projectFindFirst: vi.fn(),
  eventFindUnique: vi.fn(),
  postulationFindUnique: vi.fn(),
  transaction: vi.fn(),
  postulationCreate: vi.fn(),
  notificationCreate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    proyectoMusical: {
      findFirst: mocks.projectFindFirst,
    },
    evento: {
      findUnique: mocks.eventFindUnique,
    },
    postulacion: {
      findUnique: mocks.postulationFindUnique,
      create: mocks.postulationCreate,
    },
    notificacion: {
      create: mocks.notificationCreate,
    },
  },
}));

vi.mock("@/lib/api-helpers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api-helpers")>()),
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createPostulationForMusician } from "@/lib/postulation-access";
import { ConflictError } from "@/lib/errors";
import { POST as postulateRoute } from "@/app/api/eventos/[eventoId]/postulaciones/route";
import { applyToEvent } from "@/app/actions/contracts";
import type { Usuario } from "@/lib/types";

describe("createPostulationForMusician — manejo de colisión concurrente P2002", () => {
  const musicianId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  const organizerId = "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";
  const projectId = "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33";
  const eventId = "d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44";

  const musicianUser: Usuario = {
    id: musicianId,
    email: "musico@example.com",
    nombre: "Juan",
    apellido: "Pérez",
    rol: "MUSICO",
    fotoPerfilUrl: null,
    biografia: null,
    telefono: null,
    creadoEn: new Date(),
    actualizadoEn: new Date(),
  };

  const projectData = {
    id: projectId,
    usuarioId: musicianId,
    nombre: "Los Pogoneros",
    genero: "Rock",
    estaActivo: true,
  };

  const eventData = {
    id: eventId,
    organizadorId: organizerId,
    titulo: "Festival Primavera",
    estado: "PUBLICADO" as const,
    startsAt: new Date(Date.now() + 86400000),
    endsAt: new Date(Date.now() + 90000000),
  };

  const createdPostulation = {
    id: "55555555-5555-5555-5555-555555555555",
    eventoId: eventId,
    proyectoMusicalId: projectId,
    musicoId: musicianId,
    estado: "PENDIENTE" as const,
    mensaje: null,
    evento: {
      id: eventId,
      titulo: eventData.titulo,
      startsAt: eventData.startsAt,
      endsAt: eventData.endsAt,
    },
    proyectoMusical: {
      id: projectId,
      nombre: projectData.nombre,
      genero: projectData.genero,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.requireAuthenticatedUser.mockResolvedValue(musicianUser);
    mocks.projectFindFirst.mockResolvedValue(projectData);
    mocks.eventFindUnique.mockResolvedValue(eventData);
    mocks.postulationFindUnique.mockResolvedValue(null); // Pasa la verificación previa
    mocks.postulationCreate.mockResolvedValue(createdPostulation);
    mocks.notificationCreate.mockResolvedValue({});

    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
      return callback({
        postulacion: { create: mocks.postulationCreate },
        notificacion: { create: mocks.notificationCreate },
      });
    });
  });

  it("1. transforma una colisión concurrente P2002 en ConflictError con mensaje de negocio", async () => {
    const p2002Error = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed on the fields: (`eventoId`,`proyectoMusicalId`)",
      { code: "P2002", clientVersion: "6.19.3" }
    );
    mocks.postulationCreate.mockRejectedValue(p2002Error);

    await expect(
      createPostulationForMusician({
        eventId,
        projectId,
        musicianId,
      })
    ).rejects.toThrow(ConflictError);

    await expect(
      createPostulationForMusician({
        eventId,
        projectId,
        musicianId,
      })
    ).rejects.toMatchObject({
      code: "CONFLICT",
      statusCode: 409,
      message: "Ya existe una postulación para este proyecto en este evento",
    });
  });

  it("2. el endpoint POST responde 409 Conflict y no 500 ante colisión P2002", async () => {
    const p2002Error = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      { code: "P2002", clientVersion: "6.19.3" }
    );
    mocks.postulationCreate.mockRejectedValue(p2002Error);

    const request = new NextRequest(
      `http://localhost:3000/api/eventos/${eventId}/postulaciones`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proyectoMusicalId: projectId }),
      }
    );

    const response = await postulateRoute(request, {
      params: Promise.resolve({ eventoId: eventId }),
    });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body).toEqual({
      code: "CONFLICT",
      error: "Ya existe una postulación para este proyecto en este evento",
    });
  });

  it("3. un error Prisma diferente de P2002 no se oculta como conflicto y se propaga normalmente", async () => {
    const p2025Error = new Prisma.PrismaClientKnownRequestError(
      "An operation failed because it depends on one or more records that were required but not found",
      { code: "P2025", clientVersion: "6.19.3" }
    );
    mocks.postulationCreate.mockRejectedValue(p2025Error);

    // En la capa de acceso se relanza el error Prisma intacto
    await expect(
      createPostulationForMusician({
        eventId,
        projectId,
        musicianId,
      })
    ).rejects.toThrow(p2025Error);

    // En la API se normaliza como 500 Internal Server Error sin exponer detalles
    const request = new NextRequest(
      `http://localhost:3000/api/eventos/${eventId}/postulaciones`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proyectoMusicalId: projectId }),
      }
    );

    const response = await postulateRoute(request, {
      params: Promise.resolve({ eventoId: eventId }),
    });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.code).toBe("INTERNAL_SERVER_ERROR");
  });

  it("4. el comportamiento normal de creación sigue funcionando con éxito (201 en API y objeto creado en acceso)", async () => {
    const result = await createPostulationForMusician({
      eventId,
      projectId,
      musicianId,
      initialMessage: "Queremos tocar!",
      initialOfferAmount: 25000,
    });

    expect(result).toEqual(createdPostulation);
    expect(mocks.postulationCreate).toHaveBeenCalledTimes(1);

    const request = new NextRequest(
      `http://localhost:3000/api/eventos/${eventId}/postulaciones`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proyectoMusicalId: projectId,
          mensaje: "Queremos tocar!",
          initialOfferAmount: 25000,
        }),
      }
    );

    const response = await postulateRoute(request, {
      params: Promise.resolve({ eventoId: eventId }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toBe(createdPostulation.id);
  });

  it("5. la Server Action applyToEvent responde con code CONFLICT y mensaje controlado ante colisión P2002", async () => {
    const p2002Error = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      { code: "P2002", clientVersion: "6.19.3" }
    );
    mocks.postulationCreate.mockRejectedValue(p2002Error);

    const result = await applyToEvent(eventId, projectId);

    expect(result).toEqual({
      error: true,
      code: "CONFLICT",
      message: "Ya existe una postulación para este proyecto en este evento",
    });
  });
});
