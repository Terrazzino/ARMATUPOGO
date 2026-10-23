import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  findMany: vi.fn(),
  contractFindMany: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/api-helpers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api-helpers")>()),
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));
vi.mock("@/lib/auth-render", () => ({
  requireAuthenticatedUserForRender: mocks.requireAuthenticatedUser,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    postulacion: { findMany: mocks.findMany },
    contratacion: { findMany: mocks.contractFindMany },
  },
}));

import {
  getMyPendingPostulations,
  getMyContracts,
  getReceivedPostulations,
} from "@/app/actions/contracts";

function user(role: "MUSICO" | "ORGANIZADOR") {
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

describe("consultas privadas de contratos del músico", () => {
  beforeEach(() => vi.clearAllMocks());

  it("consulta únicamente postulaciones pendientes propias y las ordena por evento", async () => {
    const musician = user("MUSICO");
    mocks.requireAuthenticatedUser.mockResolvedValue(musician);
    mocks.findMany.mockResolvedValue([]);

    await getMyPendingPostulations();

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { musicoId: musician.id, estado: "PENDIENTE" },
        orderBy: [
          { evento: { startsAt: "asc" } },
          { id: "asc" },
        ],
      })
    );
  });

  it("impide que un organizador use la consulta privada del músico", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue(user("ORGANIZADOR"));

    await expect(getMyPendingPostulations()).rejects.toMatchObject({
      code: "AUTHORIZATION_ERROR",
    });
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("limita las postulaciones recibidas a eventos propios y selecciona datos mínimos", async () => {
    const organizer = user("ORGANIZADOR");
    mocks.requireAuthenticatedUser.mockResolvedValue(organizer);
    mocks.findMany.mockResolvedValue([]);

    await getReceivedPostulations();

    const query = mocks.findMany.mock.calls[0][0];
    expect(query.where).toEqual({
      evento: { organizadorId: organizer.id },
      estado: { in: ["PENDIENTE", "ACEPTADA", "RECHAZADA", "CANCELADA"] },
    });
    expect(query.select.evento.select).toEqual({
      id: true,
      titulo: true,
      startsAt: true,
      estado: true,
    });
    expect(query.select.musico.select).toEqual({ nombre: true, apellido: true });
    expect(query.select.musico.select).not.toHaveProperty("email");
    expect(query.select.musico.select).not.toHaveProperty("telefono");
  });

  it("impide que un músico consulte postulaciones recibidas como organizador", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue(user("MUSICO"));

    await expect(getReceivedPostulations()).rejects.toMatchObject({
      code: "AUTHORIZATION_ERROR",
    });
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("limita las contrataciones del organizador al participante autenticado", async () => {
    const organizer = user("ORGANIZADOR");
    mocks.requireAuthenticatedUser.mockResolvedValue(organizer);
    mocks.contractFindMany.mockResolvedValue([]);

    await getMyContracts();

    expect(mocks.contractFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizadorId: organizer.id } })
    );
  });
});
