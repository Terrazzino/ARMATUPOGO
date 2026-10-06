import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
  txEventUpdate: vi.fn(),
  txPostulationUpdateMany: vi.fn(),
  txContractUpdateMany: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/api-helpers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api-helpers")>()),
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    evento: {
      findMany: mocks.findMany,
      findFirst: mocks.findFirst,
      create: mocks.create,
      update: mocks.update,
    },
    $transaction: mocks.transaction,
  },
}));

import {
  cancelEvent,
  createEvent,
  getEventById,
  getMyEventById,
  getMyEvents,
  getPublicEvents,
  updateEvent,
} from "@/app/actions/events";
import type { RolUsuario, Usuario } from "@/lib/types";

function user(role: RolUsuario = "ORGANIZADOR"): Usuario {
  return {
    id: crypto.randomUUID(),
    email: "persona@example.com",
    nombre: "Nombre",
    apellido: "Apellido",
    rol: role,
    creadoEn: new Date(),
    actualizadoEn: new Date(),
  };
}

function event(ownerId: string) {
  return {
    id: crypto.randomUUID(),
    organizadorId: ownerId,
    titulo: "Festival Actions",
    startsAt: new Date(Date.now() + 86_400_000),
    endsAt: new Date(Date.now() + 90_000_000),
    estado: "PUBLICADO" as const,
    contrataciones: [],
  };
}

function input() {
  return {
    titulo: "Festival Actions",
    startsAt: new Date(Date.now() + 86_400_000).toISOString(),
    endsAt: new Date(Date.now() + 90_000_000).toISOString(),
    ubicacion: "Sala de pruebas",
    cantidadMusicosRequerida: 2,
  };
}

describe("Server Actions de eventos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        evento: { update: mocks.txEventUpdate },
        postulacion: { updateMany: mocks.txPostulationUpdateMany },
        contratacion: { updateMany: mocks.txContractUpdateMany },
      })
    );
  });

  it("crea con organizadorId derivado de la sesión", async () => {
    const organizer = user();
    mocks.requireAuthenticatedUser.mockResolvedValue(organizer);
    mocks.create.mockResolvedValue(event(organizer.id));

    const result = await createEvent(input());

    expect(result).toMatchObject({ success: true });
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ organizadorId: organizer.id, estado: "PUBLICADO" }),
    });
  });

  it("rechaza a un MUSICO con AUTHORIZATION_ERROR", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue(user("MUSICO"));

    const result = await createEvent(input());

    expect(result).toMatchObject({ error: true, code: "AUTHORIZATION_ERROR" });
  });

  it("lista solamente eventos propios", async () => {
    const organizer = user();
    mocks.requireAuthenticatedUser.mockResolvedValue(organizer);
    mocks.findMany.mockResolvedValue([]);

    await getMyEvents();

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizadorId: organizer.id } })
    );
  });

  it("actualiza con ownership en lectura y escritura", async () => {
    const organizer = user();
    const owned = event(organizer.id);
    mocks.requireAuthenticatedUser.mockResolvedValue(organizer);
    mocks.findFirst.mockResolvedValue(owned);
    mocks.update.mockResolvedValue({ ...owned, titulo: "Actualizado" });

    const result = await updateEvent(owned.id, { titulo: "Actualizado" });

    expect(result).toMatchObject({ success: true });
    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: owned.id, organizadorId: organizer.id } })
    );
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: owned.id, organizadorId: organizer.id } })
    );
  });

  it("consulta el detalle privado propio con ownership", async () => {
    const organizer = user();
    const owned = event(organizer.id);
    mocks.requireAuthenticatedUser.mockResolvedValue(organizer);
    mocks.findFirst.mockResolvedValue(owned);

    expect(await getMyEventById(owned.id)).toBe(owned);
    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: owned.id, organizadorId: organizer.id } })
    );
  });

  it("el detalle privado ajeno lanza NOT_FOUND", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue(user());
    mocks.findFirst.mockResolvedValue(null);

    await expect(getMyEventById(crypto.randomUUID())).rejects.toMatchObject({
      code: "NOT_FOUND",
      statusCode: 404,
    });
  });

  it("un evento ajeno se trata como NOT_FOUND", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue(user());
    mocks.findFirst.mockResolvedValue(null);

    const result = await updateEvent(crypto.randomUUID(), { titulo: "Actualizado" });

    expect(result).toMatchObject({ error: true, code: "NOT_FOUND" });
  });

  it("cancelar reutiliza el flujo transaccional con ownership", async () => {
    const organizer = user();
    const owned = event(organizer.id);
    mocks.requireAuthenticatedUser.mockResolvedValue(organizer);
    mocks.findFirst.mockResolvedValue(owned);
    mocks.txEventUpdate.mockResolvedValue({ ...owned, estado: "CANCELADO" });

    const result = await cancelEvent(owned.id);

    expect(result).toMatchObject({ success: true });
    expect(mocks.txEventUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: owned.id, organizadorId: organizer.id } })
    );
  });

  it("el detalle público exige estado PUBLICADO", async () => {
    const eventId = crypto.randomUUID();
    mocks.findFirst.mockResolvedValue(null);

    expect(await getEventById(eventId)).toBeNull();
    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: eventId, estado: "PUBLICADO" } })
    );
  });

  it("la cartelera de la UI filtra publicados no finalizados", async () => {
    mocks.findMany.mockResolvedValue([]);

    await getPublicEvents();

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          estado: "PUBLICADO",
          endsAt: { gt: expect.any(Date) },
        }),
      })
    );
  });
});
