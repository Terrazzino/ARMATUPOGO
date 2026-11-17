import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  contractFindFirst: vi.fn(),
  offerCreate: vi.fn(),
  offerUpdateMany: vi.fn(),
  notificationCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    contratacion: {
      findFirst: mocks.contractFindFirst,
    },
    oferta: {
      create: mocks.offerCreate,
      updateMany: mocks.offerUpdateMany,
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

import { createOfferForParticipant } from "@/lib/offer-access";
import { ConflictError } from "@/lib/errors";
import { POST as createOfferRoute } from "@/app/api/contrataciones/[contratacionId]/ofertas/route";
import { createOffer } from "@/app/actions/contracts";
import type { Usuario } from "@/lib/types";

describe("createOfferForParticipant — manejo de colisión concurrente P2002", () => {
  const musicianId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  const organizerId = "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";
  const contractId = "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33";
  const offerId = "d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44";

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

  const contractData = {
    id: contractId,
    organizadorId: organizerId,
    musicoId: musicianId,
    estado: "NEGOCIANDO" as const,
    evento: { titulo: "Festival Primavera" },
    ofertas: [
      {
        id: "e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55",
        remitenteId: organizerId,
        monto: new Prisma.Decimal(30000),
        estado: "PROPUESTA" as const,
      },
    ],
  };

  const createdOfferData = {
    id: offerId,
    contratacionId: contractId,
    remitenteId: musicianId,
    monto: new Prisma.Decimal(35000),
    mensaje: "Contraoferta",
    estado: "PROPUESTA" as const,
    creadoEn: new Date(),
    actualizadoEn: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.requireAuthenticatedUser.mockResolvedValue(musicianUser);
    mocks.contractFindFirst.mockResolvedValue(contractData);
    mocks.offerUpdateMany.mockResolvedValue({ count: 1 });
    mocks.offerCreate.mockResolvedValue(createdOfferData);
    mocks.notificationCreate.mockResolvedValue({});

    mocks.transaction.mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) => {
        return callback({
          oferta: {
            create: mocks.offerCreate,
            updateMany: mocks.offerUpdateMany,
          },
          notificacion: { create: mocks.notificationCreate },
        });
      }
    );
  });

  it("1. transforma una colisión concurrente P2002 en ConflictError con mensaje de negocio", async () => {
    const p2002Error = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed on the fields: (`contract_id`)",
      { code: "P2002", clientVersion: "6.19.3" }
    );
    mocks.offerCreate.mockRejectedValue(p2002Error);

    await expect(
      createOfferForParticipant({
        contractId,
        userId: musicianId,
        amount: 35000,
        message: "Contraoferta concurrente",
      })
    ).rejects.toThrow(ConflictError);

    await expect(
      createOfferForParticipant({
        contractId,
        userId: musicianId,
        amount: 35000,
        message: "Contraoferta concurrente",
      })
    ).rejects.toMatchObject({
      code: "CONFLICT",
      statusCode: 409,
      message: "Ya existe una propuesta activa en esta negociación",
    });
  });

  it("2. el endpoint POST responde 409 Conflict y no 500 ante colisión P2002", async () => {
    const p2002Error = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      { code: "P2002", clientVersion: "6.19.3" }
    );
    mocks.offerCreate.mockRejectedValue(p2002Error);

    const request = new NextRequest(
      `http://localhost:3000/api/contrataciones/${contractId}/ofertas`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monto: 35000, mensaje: "Contraoferta" }),
      }
    );

    const response = await createOfferRoute(request, {
      params: Promise.resolve({ contratacionId: contractId }),
    });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body).toEqual({
      code: "CONFLICT",
      error: "Ya existe una propuesta activa en esta negociación",
    });
  });

  it("3. un error Prisma diferente de P2002 no se oculta como conflicto y se propaga normalmente", async () => {
    const p2025Error = new Prisma.PrismaClientKnownRequestError(
      "An operation failed because it depends on one or more records that were required but not found",
      { code: "P2025", clientVersion: "6.19.3" }
    );
    mocks.offerCreate.mockRejectedValue(p2025Error);

    await expect(
      createOfferForParticipant({
        contractId,
        userId: musicianId,
        amount: 35000,
      })
    ).rejects.toThrow(p2025Error);

    const request = new NextRequest(
      `http://localhost:3000/api/contrataciones/${contractId}/ofertas`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monto: 35000 }),
      }
    );

    const response = await createOfferRoute(request, {
      params: Promise.resolve({ contratacionId: contractId }),
    });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.code).toBe("INTERNAL_SERVER_ERROR");
  });

  it("4. la Server Action createOffer devuelve estado de conflicto controlado (code CONFLICT)", async () => {
    const p2002Error = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      { code: "P2002", clientVersion: "6.19.3" }
    );
    mocks.offerCreate.mockRejectedValue(p2002Error);

    const result = await createOffer({
      contratacionId: contractId,
      monto: 35000,
      mensaje: "Contraoferta simultánea",
    });

    expect(result).toEqual({
      error: true,
      code: "CONFLICT",
      message: "Ya existe una propuesta activa en esta negociación",
    });
  });

  it("5. creación normal exitosa persiste oferta y responde 201 en HTTP", async () => {
    const result = await createOfferForParticipant({
      contractId,
      userId: musicianId,
      amount: 35000,
      message: "Contraoferta válida",
    });

    expect(result).toEqual(createdOfferData);
    expect(mocks.offerCreate).toHaveBeenCalledTimes(1);

    const request = new NextRequest(
      `http://localhost:3000/api/contrataciones/${contractId}/ofertas`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monto: 35000, mensaje: "Contraoferta válida" }),
      }
    );

    const response = await createOfferRoute(request, {
      params: Promise.resolve({ contratacionId: contractId }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toBe(createdOfferData.id);
  });
});
