import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    evento: {
      findFirst: mocks.findFirst,
      update: mocks.update,
    },
  },
}));

import { updateOwnedEvent } from "@/lib/event-access";
import { ConflictError, NotFoundError } from "@/lib/errors";

describe("updateOwnedEvent — concurrencia Serializable y retry P2034", () => {
  const eventId = "11111111-1111-1111-1111-111111111111";
  const organizerId = "22222222-2222-2222-2222-222222222222";

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback, options) => {
      expect(options).toEqual({ isolationLevel: "Serializable" });
      return callback({
        evento: {
          findFirst: mocks.findFirst,
          update: mocks.update,
        },
      });
    });
  });

  const baseEvent = {
    id: eventId,
    organizadorId: organizerId,
    titulo: "Evento Test",
    startsAt: new Date(Date.now() + 86400000),
    endsAt: new Date(Date.now() + 90000000),
    contrataciones: [],
    entradas: [],
  };

  it("actualiza exitosamente en la primera pasada con aislamiento Serializable", async () => {
    mocks.findFirst.mockResolvedValue(baseEvent);
    mocks.update.mockResolvedValue({ ...baseEvent, titulo: "Nuevo" });

    const result = await updateOwnedEvent(eventId, organizerId, { titulo: "Nuevo" });

    expect(result).toMatchObject({ titulo: "Nuevo" });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });

  it("reintenta ante conflicto de serialización (P2034) y tiene éxito en el reintento", async () => {
    mocks.findFirst.mockResolvedValue(baseEvent);
    mocks.update.mockResolvedValue({ ...baseEvent, titulo: "Nuevo" });

    const p2034 = new Prisma.PrismaClientKnownRequestError("Serialization failure", {
      code: "P2034",
      clientVersion: "6.0.0",
    });

    let attempt = 0;
    mocks.transaction.mockImplementation(async (callback) => {
      attempt++;
      if (attempt === 1) throw p2034;
      return callback({
        evento: {
          findFirst: mocks.findFirst,
          update: mocks.update,
        },
      });
    });

    const result = await updateOwnedEvent(eventId, organizerId, { precioEntrada: 5000 });

    expect(result).toBeDefined();
    expect(attempt).toBe(2);
  });

  it("lanza ConflictError si se agotan los reintentos por conflicto de concurrencia", async () => {
    const p2034 = new Prisma.PrismaClientKnownRequestError("Serialization failure", {
      code: "P2034",
      clientVersion: "6.0.0",
    });

    mocks.transaction.mockRejectedValue(p2034);

    await expect(
      updateOwnedEvent(eventId, organizerId, { precioEntrada: 5000 })
    ).rejects.toThrow(ConflictError);

    // Intentos: 0, 1, 2 = 3 llamadas en total
    expect(mocks.transaction).toHaveBeenCalledTimes(3);
  });

  it("lanza NotFoundError si el evento no existe o no pertenece al organizador", async () => {
    mocks.findFirst.mockResolvedValue(null);

    await expect(
      updateOwnedEvent(eventId, organizerId, { titulo: "Nuevo" })
    ).rejects.toThrow(NotFoundError);
  });
});
