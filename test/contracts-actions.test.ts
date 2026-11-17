import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  findMany: vi.fn(),
  contractFindMany: vi.fn(),
  revalidatePath: vi.fn(),
  createDirectContract: vi.fn(),
  cancelOwnedPostulation: vi.fn(),
  createOfferForParticipant: vi.fn(),
  completeParticipatingContract: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/api-helpers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api-helpers")>()),
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));
vi.mock("@/lib/auth-render", () => ({
  requireAuthenticatedUserForRender: mocks.requireAuthenticatedUser,
}));
vi.mock("@/lib/contract-access", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/contract-access")>();
  return {
    ...actual,
    createDirectContract: mocks.createDirectContract,
    completeParticipatingContract: mocks.completeParticipatingContract,
  };
});
vi.mock("@/lib/postulation-access", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/postulation-access")>();
  return {
    ...actual,
    cancelOwnedPostulation: mocks.cancelOwnedPostulation,
  };
});
vi.mock("@/lib/offer-access", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/offer-access")>();
  return {
    ...actual,
    createOfferForParticipant: mocks.createOfferForParticipant,
  };
});
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
  inviteProject,
  cancelPostulation,
  createOffer,
  completeContract,
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

    const query = mocks.findMany.mock.calls[0][0];
    expect(query.select.evento.select).toEqual({
      id: true,
      titulo: true,
      startsAt: true,
      endsAt: true,
      estado: true,
      ubicacion: true,
      nombreLugar: true,
      ciudad: true,
      organizador: {
        select: { id: true, nombre: true, apellido: true },
      },
    });
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
      endsAt: true,
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

describe("revalidación de rutas en mutaciones de contratos", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inviteProject revalida dashboard de organizador y músico", async () => {
    const organizer = user("ORGANIZADOR");
    mocks.requireAuthenticatedUser.mockResolvedValue(organizer);
    mocks.createDirectContract.mockResolvedValue({ id: crypto.randomUUID() });

    const result = await inviteProject(crypto.randomUUID(), crypto.randomUUID(), 10000, "Hola");

    expect(result.success).toBe(true);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/organizer");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/musician");
  });

  it("cancelPostulation revalida dashboard de músico y organizador", async () => {
    const musician = user("MUSICO");
    mocks.requireAuthenticatedUser.mockResolvedValue(musician);
    mocks.cancelOwnedPostulation.mockResolvedValue({ id: crypto.randomUUID(), estado: "CANCELADA" });

    const result = await cancelPostulation(crypto.randomUUID());

    expect(result.success).toBe(true);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/musician");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/organizer");
  });

  it("createOffer revalida ambos dashboards y el detalle del contrato", async () => {
    const userMusician = user("MUSICO");
    const contractId = crypto.randomUUID();
    mocks.requireAuthenticatedUser.mockResolvedValue(userMusician);
    mocks.createOfferForParticipant.mockResolvedValue({ id: crypto.randomUUID(), estado: "PROPUESTA" });

    const result = await createOffer({
      contratacionId: contractId,
      monto: 50000,
      mensaje: "Oferta",
    });

    expect(result.success).toBe(true);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/musician");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/organizer");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/contracts/${contractId}`);
  });

  it("completeContract revalida ambos dashboards", async () => {
    const userMusician = user("MUSICO");
    const contractId = crypto.randomUUID();
    mocks.requireAuthenticatedUser.mockResolvedValue(userMusician);
    mocks.completeParticipatingContract.mockResolvedValue({ id: contractId, estado: "COMPLETADO" });

    const result = await completeContract(contractId);

    expect(result.success).toBe(true);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/musician");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/organizer");
  });
});
