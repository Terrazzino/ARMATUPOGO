import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  count: vi.fn(),
  findMany: vi.fn(),
  projectFindMany: vi.fn(),
  postulationFindMany: vi.fn(),
  contractFindMany: vi.fn(),
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
vi.mock("@/lib/auth-render", () => ({
  requireAuthenticatedUserForRender: mocks.requireAuthenticatedUser,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    evento: {
      count: mocks.count,
      findMany: mocks.findMany,
      findFirst: mocks.findFirst,
      create: mocks.create,
      update: mocks.update,
    },
    proyectoMusical: { findMany: mocks.projectFindMany },
    postulacion: { findMany: mocks.postulationFindMany },
    contratacion: { findMany: mocks.contractFindMany },
    $transaction: mocks.transaction,
  },
}));

import {
  cancelEvent,
  createEvent,
  getEventById,
  getMusicianEventContext,
  getMyEventById,
  getMyEvents,
  getPaginatedMusicianEvents,
  getPaginatedPublicEvents,
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
        orderBy: [{ startsAt: "asc" }, { id: "asc" }],
      })
    );
  });

  it.each([
    { total: 0, expectedPages: 0 },
    { total: 1, expectedPages: 1 },
    { total: 9, expectedPages: 1 },
    { total: 10, expectedPages: 2 },
    { total: 23, expectedPages: 3 },
  ])("calcula la paginación para $total eventos", async ({ total, expectedPages }) => {
    mocks.count.mockResolvedValue(total);
    mocks.findMany.mockResolvedValue([]);

    const result = await getPaginatedPublicEvents({ page: 1 });

    expect(result).toMatchObject({
      totalCount: total,
      totalPages: expectedPages,
      currentPage: 1,
    });
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 9,
        orderBy: [{ startsAt: "asc" }, { id: "asc" }],
      })
    );
  });

  it("pagina después de aplicar visibilidad y filtros", async () => {
    mocks.count.mockResolvedValue(14);
    mocks.findMany.mockResolvedValue([]);

    const result = await getPaginatedPublicEvents({
      page: 2,
      city: "Rosario",
      search: "Pogo",
    });

    expect(result).toMatchObject({ totalCount: 14, totalPages: 2, currentPage: 2 });
    expect(mocks.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        estado: "PUBLICADO",
        endsAt: { gt: expect.any(Date) },
        ciudad: { contains: "Rosario", mode: "insensitive" },
        OR: expect.any(Array),
      }),
    });
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: mocks.count.mock.calls[0][0].where,
        skip: 9,
        take: 9,
      })
    );
  });

  it("inicia el conteo y el listado de una página válida concurrentemente", async () => {
    let resolveCount!: (value: number) => void;
    const pendingCount = new Promise<number>((resolve) => {
      resolveCount = resolve;
    });
    mocks.count.mockReturnValue(pendingCount);
    mocks.findMany.mockResolvedValue([]);

    const result = getPaginatedPublicEvents({ page: 1 });

    await vi.waitFor(() => expect(mocks.findMany).toHaveBeenCalledTimes(1));
    resolveCount(1);
    await expect(result).resolves.toMatchObject({ currentPage: 1, totalCount: 1 });
  });

  it("usa en las tarjetas sólo los campos públicos que consumen", async () => {
    mocks.count.mockResolvedValue(1);
    mocks.findMany.mockResolvedValue([]);

    await getPaginatedPublicEvents({ page: 1 });

    const select = mocks.findMany.mock.calls[0][0].select;
    expect(select).toMatchObject({
      id: true,
      titulo: true,
      startsAt: true,
      ubicacion: true,
      contrataciones: expect.any(Object),
      entradas: expect.any(Object),
    });
    expect(select).not.toHaveProperty("descripcion");
    expect(select).not.toHaveProperty("organizador");
    expect(select.contrataciones.select.proyectoMusical.select).not.toHaveProperty("imagenUrl");
  });

  it("limita una página inexistente a la última página disponible", async () => {
    mocks.count.mockResolvedValue(10);
    mocks.findMany.mockResolvedValue([]);

    const result = await getPaginatedPublicEvents({ page: 99 });

    expect(result.currentPage).toBe(2);
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 9, take: 9 })
    );
  });

  it("limita la cartelera especializada al músico y a sus proyectos activos", async () => {
    const musician = user("MUSICO");
    mocks.requireAuthenticatedUser.mockResolvedValue(musician);
    mocks.count.mockResolvedValue(10);
    mocks.projectFindMany.mockResolvedValue([
      { id: "proyecto-1", nombre: "Banda Uno" },
      { id: "proyecto-2", nombre: "Banda Dos" },
    ]);
    mocks.findMany.mockResolvedValue([]);

    const result = await getPaginatedMusicianEvents({
      page: 2,
      city: "Rosario",
      search: "Pogo",
    });

    expect(result).toMatchObject({ totalCount: 10, totalPages: 2, currentPage: 2 });
    expect(result.projects).toHaveLength(2);
    expect(mocks.projectFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { usuarioId: musician.id, estaActivo: true },
      })
    );
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          estado: "PUBLICADO",
          endsAt: { gt: expect.any(Date) },
          ciudad: { contains: "Rosario", mode: "insensitive" },
          OR: expect.any(Array),
        }),
        orderBy: [{ startsAt: "asc" }, { id: "asc" }],
        skip: 9,
        take: 9,
      })
    );
  });

  it("inicia proyectos, conteo y eventos concurrentemente en la primera página del músico", async () => {
    let resolveCount!: (value: number) => void;
    const pendingCount = new Promise<number>((resolve) => {
      resolveCount = resolve;
    });
    mocks.requireAuthenticatedUser.mockResolvedValue(user("MUSICO"));
    mocks.count.mockReturnValue(pendingCount);
    mocks.projectFindMany.mockResolvedValue([]);
    mocks.findMany.mockResolvedValue([]);

    const result = getPaginatedMusicianEvents({ page: 1 });

    await vi.waitFor(() => {
      expect(mocks.projectFindMany).toHaveBeenCalledTimes(1);
      expect(mocks.findMany).toHaveBeenCalledTimes(1);
    });
    resolveCount(0);
    await expect(result).resolves.toMatchObject({ currentPage: 1, totalCount: 0 });
  });

  it("rechaza la cartelera especializada para un organizador", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue(user("ORGANIZADOR"));

    await expect(getPaginatedMusicianEvents()).rejects.toMatchObject({
      code: "AUTHORIZATION_ERROR",
    });
    expect(mocks.count).not.toHaveBeenCalled();
  });

  it("consulta sólo proyectos y relaciones privadas del músico actual para un evento", async () => {
    const musician = user("MUSICO");
    const eventId = crypto.randomUUID();
    mocks.requireAuthenticatedUser.mockResolvedValue(musician);
    mocks.projectFindMany.mockResolvedValue([{ id: "proyecto-1", nombre: "Banda Uno" }]);
    mocks.postulationFindMany.mockResolvedValue([]);
    mocks.contractFindMany.mockResolvedValue([]);

    const result = await getMusicianEventContext(eventId);

    expect(result.projects).toHaveLength(1);
    expect(mocks.projectFindMany).toHaveBeenCalledWith({
      where: { usuarioId: musician.id, estaActivo: true },
      orderBy: { creadoEn: "desc" },
      select: { id: true, nombre: true },
    });
    expect(mocks.postulationFindMany).toHaveBeenCalledWith({
      where: { musicoId: musician.id, eventoId: eventId },
      select: { proyectoMusicalId: true, estado: true },
    });
    expect(mocks.contractFindMany).toHaveBeenCalledWith({
      where: { musicoId: musician.id, eventoId: eventId },
      select: { proyectoMusicalId: true, estado: true },
    });
  });

  it("protege el contexto privado del evento frente a organizadores", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue(user("ORGANIZADOR"));

    await expect(getMusicianEventContext(crypto.randomUUID())).rejects.toMatchObject({
      code: "AUTHORIZATION_ERROR",
    });
    expect(mocks.postulationFindMany).not.toHaveBeenCalled();
    expect(mocks.contractFindMany).not.toHaveBeenCalled();
  });

  it("informa una lista vacía cuando el músico no tiene proyectos activos", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue(user("MUSICO"));
    mocks.count.mockResolvedValue(0);
    mocks.projectFindMany.mockResolvedValue([]);
    mocks.findMany.mockResolvedValue([]);

    const result = await getPaginatedMusicianEvents();

    expect(result.projects).toEqual([]);
    expect(result.events).toEqual([]);
    expect(mocks.postulationFindMany).not.toHaveBeenCalled();
    expect(mocks.contractFindMany).not.toHaveBeenCalled();
  });
});
