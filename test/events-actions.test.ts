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
  entradaCreate: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
  txEventUpdate: vi.fn(),
  txPostulationUpdateMany: vi.fn(),
  txContractUpdateMany: vi.fn(),
  revalidatePath: vi.fn(),
  uploadEventImage: vi.fn(),
  removeEventImage: vi.fn(),
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
    entrada: { create: mocks.entradaCreate },
    proyectoMusical: { findMany: mocks.projectFindMany },
    postulacion: { findMany: mocks.postulationFindMany },
    contratacion: { findMany: mocks.contractFindMany },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/services/event-image-storage", () => ({
  uploadEventImage: mocks.uploadEventImage,
  removeEventImage: mocks.removeEventImage,
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
    bannerUrl: null,
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
    precioEntrada: 10000,
  };
}

describe("Server Actions de eventos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        evento: { findFirst: mocks.findFirst, update: (...args: unknown[]) => (args[0] as { data?: { estado?: string } })?.data?.estado === "CANCELADO" ? mocks.txEventUpdate(...args) : mocks.update(...args) },
        postulacion: { updateMany: mocks.txPostulationUpdateMany },
        contratacion: { findMany: vi.fn().mockResolvedValue([]), updateMany: mocks.txContractUpdateMany },
        notificacion: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
      })
    );
    mocks.removeEventImage.mockResolvedValue(true);
  });

  function eventFormData(data = input(), imageAction = "keep", image?: File) {
    const formData = new FormData();
    formData.set("event", JSON.stringify(data));
    formData.set("imageAction", imageAction);
    if (image) formData.set("image", image);
    return formData;
  }

  function validFlyer() {
    const bytes = new Uint8Array(32);
    bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
    new DataView(bytes.buffer).setUint32(8, 13, false);
    bytes.set([73, 72, 68, 82], 12);
    new DataView(bytes.buffer).setUint32(16, 800, false);
    new DataView(bytes.buffer).setUint32(20, 1000, false);
    return new File([bytes], "flyer.png", { type: "image/png" });
  }

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

  it("crea el evento con una única Entrada GENERAL anidada y paga", async () => {
    const organizer = user();
    mocks.requireAuthenticatedUser.mockResolvedValue(organizer);
    mocks.create.mockResolvedValue(event(organizer.id));

    const result = await createEvent(input());

    expect(result).toMatchObject({ success: true });
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.create.mock.calls[0][0].data.entradas).toEqual({
      create: { tipoEntrada: "GENERAL", precio: 10000, esGratuita: false },
    });
    // Operación única y atómica: sin escritura separada de Entrada ni transacción manual.
    expect(mocks.entradaCreate).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("crea una Entrada GENERAL gratuita cuando el precio es 0", async () => {
    const organizer = user();
    mocks.requireAuthenticatedUser.mockResolvedValue(organizer);
    mocks.create.mockResolvedValue(event(organizer.id));

    const result = await createEvent({ ...input(), precioEntrada: 0 });

    expect(result).toMatchObject({ success: true });
    expect(mocks.create.mock.calls[0][0].data.entradas).toEqual({
      create: { tipoEntrada: "GENERAL", precio: 0, esGratuita: true },
    });
  });

  it.each([
    ["negativo", { precioEntrada: -1 }],
    ["decimal", { precioEntrada: 1500.5 }],
    ["mayor al máximo", { precioEntrada: 100_000_001 }],
    ["texto", { precioEntrada: "10000" }],
    ["ausente", { precioEntrada: undefined }],
  ])("rechaza el alta con precio %s", async (_name, override) => {
    mocks.requireAuthenticatedUser.mockResolvedValue(user());

    const result = await createEvent({ ...input(), ...override } as never);

    expect(result).toMatchObject({ error: true, code: "VALIDATION_ERROR" });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("informa un mensaje claro cuando falta el precio", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue(user());

    const result = await createEvent({ ...input(), precioEntrada: undefined } as never);

    expect(result).toMatchObject({
      message: "Ingresá el precio de entrada (0 si es gratuita)",
    });
  });

  it("crea sin flyer mediante multipart aunque Storage no intervenga", async () => {
    const organizer = user();
    mocks.requireAuthenticatedUser.mockResolvedValue(organizer);
    mocks.create.mockResolvedValue(event(organizer.id));

    const result = await createEvent(eventFormData());

    expect(result).toMatchObject({ success: true });
    expect(mocks.uploadEventImage).not.toHaveBeenCalled();
  });

  it("bloquea el alta con flyer antes de crear una fila pública incompleta", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue(user());

    const result = await createEvent(eventFormData(input(), "replace", validFlyer()));

    expect(result).toMatchObject({ error: true, code: "VALIDATION_ERROR" });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.uploadEventImage).not.toHaveBeenCalled();
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

  it("edita el precio actualizando la Entrada GENERAL existente", async () => {
    const organizer = user();
    const owned = { ...event(organizer.id), entradas: [{ id: "entrada-general" }] };
    mocks.requireAuthenticatedUser.mockResolvedValue(organizer);
    mocks.findFirst.mockResolvedValue(owned);
    mocks.update.mockResolvedValue(owned);

    const result = await updateEvent(owned.id, { precioEntrada: 0 });

    expect(result).toMatchObject({ success: true });
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: owned.id, organizadorId: organizer.id },
        data: {
          entradas: {
            update: {
              where: { id: "entrada-general" },
              data: { tipoEntrada: "GENERAL", precio: 0, esGratuita: true },
            },
          },
        },
      })
    );
  });

  it("crea la Entrada GENERAL al editar el precio de un evento antiguo sin Entrada", async () => {
    const organizer = user();
    const owned = { ...event(organizer.id), entradas: [] };
    mocks.requireAuthenticatedUser.mockResolvedValue(organizer);
    mocks.findFirst.mockResolvedValue(owned);
    mocks.update.mockResolvedValue(owned);

    const result = await updateEvent(owned.id, { precioEntrada: 8000 });

    expect(result).toMatchObject({ success: true });
    expect(mocks.update.mock.calls[0][0].data.entradas).toEqual({
      create: { tipoEntrada: "GENERAL", precio: 8000, esGratuita: false },
    });
    expect(mocks.entradaCreate).not.toHaveBeenCalled();
  });

  it("no toca las Entradas cuando la edición no incluye precio", async () => {
    const organizer = user();
    const owned = { ...event(organizer.id), entradas: [{ id: "entrada-general" }] };
    mocks.requireAuthenticatedUser.mockResolvedValue(organizer);
    mocks.findFirst.mockResolvedValue(owned);
    mocks.update.mockResolvedValue(owned);

    await updateEvent(owned.id, { titulo: "Otro título" });

    expect(mocks.update.mock.calls[0][0].data).not.toHaveProperty("entradas");
  });

  it.each([-5, 99.9])("rechaza editar el precio con %s", async (precioEntrada) => {
    const organizer = user();
    mocks.requireAuthenticatedUser.mockResolvedValue(organizer);
    mocks.findFirst.mockResolvedValue({ ...event(organizer.id), entradas: [] });

    const result = await updateEvent(crypto.randomUUID(), { precioEntrada });

    expect(result).toMatchObject({ error: true });
    expect(mocks.update).not.toHaveBeenCalled();
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

  it("mantiene bloqueadas las fechas cuando existe una negociación activa", async () => {
    const organizer = user();
    const owned = { ...event(organizer.id), contrataciones: [{ estado: "NEGOCIANDO" as const }] };
    mocks.requireAuthenticatedUser.mockResolvedValue(organizer);
    mocks.findFirst.mockResolvedValue(owned);

    const result = await updateEvent(owned.id, { startsAt: new Date(Date.now() + 172_800_000).toISOString() });

    expect(result).toMatchObject({ error: true, code: "CONFLICT" });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("no reduce cupos por debajo de contrataciones acordadas", async () => {
    const organizer = user();
    const owned = {
      ...event(organizer.id),
      cantidadMusicosRequerida: 2,
      contrataciones: [{ estado: "ACORDADO" as const }, { estado: "ACORDADO" as const }],
    };
    mocks.requireAuthenticatedUser.mockResolvedValue(organizer);
    mocks.findFirst.mockResolvedValue(owned);

    const result = await updateEvent(owned.id, { cantidadMusicosRequerida: 1 });

    expect(result).toMatchObject({ error: true, code: "CONFLICT" });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("reemplaza el flyer propio y elimina el anterior sólo después de actualizar Prisma", async () => {
    const organizer = user();
    const owned = { ...event(organizer.id), bannerUrl: `https://example.supabase.co/storage/v1/object/public/event-images/${organizer.id}/events/placeholder/old.webp` };
    owned.bannerUrl = `https://example.supabase.co/storage/v1/object/public/event-images/${organizer.id}/events/${owned.id}/${crypto.randomUUID()}.webp`;
    mocks.requireAuthenticatedUser.mockResolvedValue(organizer);
    mocks.findFirst.mockResolvedValue(owned);
    const newPath = `${organizer.id}/events/${owned.id}/${crypto.randomUUID()}.png`;
    mocks.uploadEventImage.mockResolvedValue({ path: newPath, publicUrl: `https://example.supabase.co/storage/v1/object/public/event-images/${newPath}` });
    mocks.update.mockResolvedValue({ ...owned, bannerUrl: `https://example.supabase.co/storage/v1/object/public/event-images/${newPath}` });

    const result = await updateEvent(owned.id, eventFormData({ titulo: "Actualizado" } as ReturnType<typeof input>, "replace", validFlyer()));

    expect(result).toMatchObject({ success: true });
    expect(mocks.uploadEventImage).toHaveBeenCalledWith(organizer.id, owned.id, expect.any(File));
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ bannerUrl: expect.stringContaining(newPath) }) }));
    expect(mocks.removeEventImage).toHaveBeenCalledWith(expect.stringContaining(".webp"));
  });

  it("conserva o quita el flyer sin cargas innecesarias", async () => {
    const organizer = user();
    const baseEvent = event(organizer.id);
    const owned = {
      ...baseEvent,
      bannerUrl: `https://example.supabase.co/storage/v1/object/public/event-images/${organizer.id}/events/${baseEvent.id}/${crypto.randomUUID()}.webp`,
    };
    mocks.requireAuthenticatedUser.mockResolvedValue(organizer);
    mocks.findFirst.mockResolvedValue(owned);
    mocks.update.mockResolvedValue({ ...owned, bannerUrl: null });

    await updateEvent(owned.id, eventFormData({ titulo: "Sin tocar imagen" } as ReturnType<typeof input>));
    expect(mocks.uploadEventImage).not.toHaveBeenCalled();
    expect(mocks.removeEventImage).not.toHaveBeenCalled();

    await updateEvent(owned.id, eventFormData({ titulo: "Sin flyer" } as ReturnType<typeof input>, "remove"));
    expect(mocks.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ bannerUrl: null }) }));
    expect(mocks.removeEventImage).toHaveBeenCalledOnce();
  });

  it("limpia el flyer nuevo cuando Prisma falla", async () => {
    const organizer = user();
    const owned = event(organizer.id);
    const newPath = `${organizer.id}/events/${owned.id}/${crypto.randomUUID()}.png`;
    mocks.requireAuthenticatedUser.mockResolvedValue(organizer);
    mocks.findFirst.mockResolvedValue(owned);
    mocks.uploadEventImage.mockResolvedValue({ path: newPath, publicUrl: `https://example.supabase.co/storage/v1/object/public/event-images/${newPath}` });
    mocks.update.mockRejectedValue(new Error("db unavailable"));

    const result = await updateEvent(owned.id, eventFormData({ titulo: "Actualizado" } as ReturnType<typeof input>, "replace", validFlyer()));

    expect(result).toMatchObject({ error: true });
    expect(mocks.removeEventImage).toHaveBeenCalledWith(newPath);
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

  it("rechaza la edición para un MUSICO antes de consultar el evento", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue(user("MUSICO"));

    const result = await updateEvent(crypto.randomUUID(), { titulo: "No autorizado" });

    expect(result).toMatchObject({ error: true, code: "AUTHORIZATION_ERROR" });
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it("rechaza un ID inválido sin consultar Prisma", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue(user());

    const result = await updateEvent("id-invalido", { titulo: "No válido" });

    expect(result).toMatchObject({ error: true, code: "VALIDATION_ERROR" });
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it("no modifica Prisma cuando falla la carga del flyer", async () => {
    const organizer = user();
    const owned = event(organizer.id);
    mocks.requireAuthenticatedUser.mockResolvedValue(organizer);
    mocks.findFirst.mockResolvedValue(owned);
    mocks.uploadEventImage.mockRejectedValue(Object.assign(new Error("storage unavailable"), { code: "SERVICE_UNAVAILABLE" }));

    const result = await updateEvent(owned.id, eventFormData({ titulo: "Actualizado" } as ReturnType<typeof input>, "replace", validFlyer()));

    expect(result).toMatchObject({ error: true });
    expect(mocks.update).not.toHaveBeenCalled();
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
