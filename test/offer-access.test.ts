import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const txMocks = vi.hoisted(() => ({
  ofertaFindFirst: vi.fn(),
  ofertaUpdateMany: vi.fn(),
  ofertaFindUniqueOrThrow: vi.fn(),
  contratacionFindMany: vi.fn(),
  contratacionUpdateMany: vi.fn(),
  contratacionFindUniqueOrThrow: vi.fn(),
}));

const globalMocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  globalContratacionFindMany: vi.fn(),
  globalOfertaFindFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: globalMocks.transaction,
    contratacion: {
      findMany: globalMocks.globalContratacionFindMany,
    },
    oferta: {
      findFirst: globalMocks.globalOfertaFindFirst,
    },
  },
}));

import { acceptOfferAsCounterparty } from "@/lib/offer-access";
import { ConflictError } from "@/lib/errors";

describe("acceptOfferAsCounterparty — transaccionalidad Serializable y retry de concurrencia", () => {
  const offerId = "11111111-1111-1111-1111-111111111111";
  const userId = "22222222-2222-2222-2222-222222222222"; // organizador aceptando
  const musicoId = "33333333-3333-3333-3333-333333333333";
  const contractId = "44444444-4444-4444-4444-444444444444";
  const eventId = "55555555-5555-5555-5555-555555555555";

  const txMock = {
    oferta: {
      findFirst: txMocks.ofertaFindFirst,
      updateMany: txMocks.ofertaUpdateMany,
      findUniqueOrThrow: txMocks.ofertaFindUniqueOrThrow,
    },
    contratacion: {
      findMany: txMocks.contratacionFindMany,
      updateMany: txMocks.contratacionUpdateMany,
      findUniqueOrThrow: txMocks.contratacionFindUniqueOrThrow,
    },
    notificacion: {
      create: vi.fn().mockResolvedValue({ id: "mock-notif" }),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };

  type TransactionCallback<T = unknown> = (tx: typeof txMock) => Promise<T>;

  const createBaseOffer = (overrides?: {
    cuposOcupados?: number;
    cantidadRequerida?: number;
  }) => ({
    id: offerId,
    remitenteId: musicoId, // enviada por el músico, aceptada por organizador (userId)
    monto: new Prisma.Decimal(150000),
    estado: "PROPUESTA" as const,
    contratacion: {
      id: contractId,
      organizadorId: userId,
      musicoId: musicoId,
      estado: "NEGOCIANDO" as const,
      evento: {
        id: eventId,
        startsAt: new Date("2026-11-20T20:00:00Z"),
        endsAt: new Date("2026-11-20T23:00:00Z"),
        cantidadMusicosRequerida: overrides?.cantidadRequerida ?? 2,
        contrataciones: Array.from({ length: overrides?.cuposOcupados ?? 0 }, (_, i) => ({
          id: `acordado-${i}`,
          estado: "ACORDADO" as const,
        })),
      },
      ofertas: [
        {
          id: offerId,
          remitenteId: musicoId,
          monto: new Prisma.Decimal(150000),
          estado: "PROPUESTA" as const,
        },
      ],
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();

    globalMocks.transaction.mockImplementation(async (callback: TransactionCallback) => {
      return callback(txMock);
    });

    txMocks.ofertaFindFirst.mockResolvedValue(createBaseOffer());
    txMocks.contratacionFindMany.mockResolvedValue([]);
    txMocks.contratacionUpdateMany.mockResolvedValue({ count: 1 });
    txMocks.ofertaUpdateMany.mockResolvedValue({ count: 1 });
    txMocks.ofertaFindUniqueOrThrow.mockResolvedValue({ id: offerId, estado: "ACEPTADA" });
    txMocks.contratacionFindUniqueOrThrow.mockResolvedValue({
      id: contractId,
      estado: "ACORDADO",
      montoPactado: new Prisma.Decimal(150000),
    });
  });

  it("A. todas las consultas de oferta, cupo y agenda se ejecutan usando el cliente tx y no el prisma global", async () => {
    const result = await acceptOfferAsCounterparty(offerId, userId);

    expect(globalMocks.transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
    expect(txMocks.ofertaFindFirst).toHaveBeenCalledTimes(1);
    expect(txMocks.contratacionFindMany).toHaveBeenCalledTimes(1);
    expect(globalMocks.globalContratacionFindMany).not.toHaveBeenCalled();
    expect(globalMocks.globalOfertaFindFirst).not.toHaveBeenCalled();
    expect(result.updatedOffer.estado).toBe("ACEPTADA");
    expect(result.updatedContract.estado).toBe("ACORDADO");
  });

  it("B. si dentro de la transacción se detecta cupo agotado, no acuerda el contrato y lanza ConflictError", async () => {
    // Evento requiere 1 músico y ya hay 1 ACORDADO
    txMocks.ofertaFindFirst.mockResolvedValue(
      createBaseOffer({ cantidadRequerida: 1, cuposOcupados: 1 })
    );

    await expect(acceptOfferAsCounterparty(offerId, userId)).rejects.toThrow(
      new ConflictError("El evento no tiene cupos disponibles")
    );

    expect(txMocks.contratacionUpdateMany).not.toHaveBeenCalled();
    expect(txMocks.ofertaUpdateMany).not.toHaveBeenCalled();
  });

  it("C. si dentro de la transacción se detecta incompatibilidad horaria del músico, rechaza con ConflictError", async () => {
    txMocks.contratacionFindMany.mockResolvedValue([
      {
        id: "otro-contrato-solapado",
        estado: "ACORDADO",
        evento: {
          titulo: "Festival Superpuesto",
          startsAt: new Date("2026-11-20T21:00:00Z"),
          endsAt: new Date("2026-11-20T22:30:00Z"),
        },
      },
    ]);

    await expect(acceptOfferAsCounterparty(offerId, userId)).rejects.toThrow(
      new ConflictError("El músico no está disponible en ese horario")
    );

    expect(txMocks.contratacionUpdateMany).not.toHaveBeenCalled();
    expect(txMocks.ofertaUpdateMany).not.toHaveBeenCalled();
  });

  it("D. un P2034 en el primer intento provoca un reintento y tiene éxito en el segundo intento", async () => {
    const p2034Error = new Prisma.PrismaClientKnownRequestError(
      "Transaction failed due to a write conflict or a deadlock. Please retry your transaction",
      { code: "P2034", clientVersion: "6.0.0" }
    );

    let attempts = 0;
    globalMocks.transaction.mockImplementation(async (callback: TransactionCallback) => {
      attempts++;
      if (attempts === 1) {
        throw p2034Error;
      }
      return callback(txMock);
    });

    const result = await acceptOfferAsCounterparty(offerId, userId);

    expect(attempts).toBe(2);
    expect(result.updatedOffer.estado).toBe("ACEPTADA");
  });

  it("E. dos P2034 sucesivos reintentan y tienen éxito en el tercer intento", async () => {
    const p2034Error = new Prisma.PrismaClientKnownRequestError(
      "Write conflict",
      { code: "P2034", clientVersion: "6.0.0" }
    );

    let attempts = 0;
    globalMocks.transaction.mockImplementation(async (callback: TransactionCallback) => {
      attempts++;
      if (attempts <= 2) {
        throw p2034Error;
      }
      return callback(txMock);
    });

    const result = await acceptOfferAsCounterparty(offerId, userId);

    expect(attempts).toBe(3);
    expect(result.updatedOffer.estado).toBe("ACEPTADA");
  });

  it("F. si se agotan los 3 intentos totales (2 retries) por P2034, lanza ConflictError controlado", async () => {
    const p2034Error = new Prisma.PrismaClientKnownRequestError(
      "Write conflict",
      { code: "P2034", clientVersion: "6.0.0" }
    );

    globalMocks.transaction.mockRejectedValue(p2034Error);

    await expect(acceptOfferAsCounterparty(offerId, userId)).rejects.toThrow(
      new ConflictError(
        "La operación no pudo completarse debido a un conflicto de concurrencia. Por favor, reintenta."
      )
    );

    expect(globalMocks.transaction).toHaveBeenCalledTimes(3);
  });

  it("G. un error distinto de P2034 NO se reintenta", async () => {
    const genericError = new Error("DB network failure");
    globalMocks.transaction.mockRejectedValue(genericError);

    await expect(acceptOfferAsCounterparty(offerId, userId)).rejects.toThrow(genericError);

    expect(globalMocks.transaction).toHaveBeenCalledTimes(1);
  });

  it("H. si durante el retry una transacción previa ocupó el cupo, lanza el ConflictError de cupos específico", async () => {
    const p2034Error = new Prisma.PrismaClientKnownRequestError(
      "Write conflict",
      { code: "P2034", clientVersion: "6.0.0" }
    );

    let attempts = 0;
    globalMocks.transaction.mockImplementation(async (callback: TransactionCallback) => {
      attempts++;
      if (attempts === 1) {
        throw p2034Error;
      }
      // En el segundo intento, el cupo ya fue ocupado
      txMocks.ofertaFindFirst.mockResolvedValue(
        createBaseOffer({ cantidadRequerida: 1, cuposOcupados: 1 })
      );
      return callback(txMock);
    });

    await expect(acceptOfferAsCounterparty(offerId, userId)).rejects.toThrow(
      new ConflictError("El evento no tiene cupos disponibles")
    );

    expect(attempts).toBe(2);
  });

  it("I. carrera sobre la misma oferta: si count === 0 en el update de oferta, lanza ConflictError", async () => {
    txMocks.ofertaUpdateMany.mockResolvedValue({ count: 0 });

    await expect(acceptOfferAsCounterparty(offerId, userId)).rejects.toThrow(
      new ConflictError("Esta oferta ya no está disponible")
    );
  });

  it("J. carrera sobre dos ofertas del mismo contrato: si count === 0 en update de contrato, lanza ConflictError", async () => {
    txMocks.contratacionUpdateMany.mockResolvedValue({ count: 0 });

    await expect(acceptOfferAsCounterparty(offerId, userId)).rejects.toThrow(
      new ConflictError("La contratación ya fue acordada por otra operación")
    );
  });
});
