import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  eventFindFirst: vi.fn(),
  projectFindFirst: vi.fn(),
}));

// Cada carga del módulo representa una solicitud de render independiente.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    cache: (operation: (...args: never[]) => unknown) => {
      const results = new Map<string, unknown>();
      return (...args: never[]) => {
        const key = JSON.stringify(args);
        if (!results.has(key)) results.set(key, operation(...args));
        return results.get(key);
      };
    },
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    evento: { findFirst: mocks.eventFindFirst },
    proyectoMusical: { findFirst: mocks.projectFindFirst },
  },
}));

describe("detalle público deduplicado durante el render", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("comparte una sola consulta de evento entre metadata y página", async () => {
    const eventId = crypto.randomUUID();
    const event = { id: eventId, titulo: "Fecha compartida" };
    mocks.eventFindFirst.mockResolvedValue(event);
    const data = await import("@/lib/public-detail-data");

    const [metadataResult, pageResult] = await Promise.all([
      data.getPublicEventDetailForRender(eventId),
      data.getPublicEventDetailForRender(eventId),
    ]);

    expect(metadataResult).toBe(event);
    expect(pageResult).toBe(event);
    expect(mocks.eventFindFirst).toHaveBeenCalledOnce();
    expect(mocks.eventFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: eventId, estado: "PUBLICADO" },
      })
    );
  });

  it("comparte una sola consulta de proyecto entre metadata y página", async () => {
    const projectId = crypto.randomUUID();
    const project = { id: projectId, nombre: "Proyecto compartido", valoraciones: [] };
    mocks.projectFindFirst.mockResolvedValue(project);
    const data = await import("@/lib/public-detail-data");

    const [metadataResult, pageResult] = await Promise.all([
      data.getPublicProjectDetailForRender(projectId),
      data.getPublicProjectDetailForRender(projectId),
    ]);

    expect(metadataResult).toBe(project);
    expect(pageResult).toBe(project);
    expect(mocks.projectFindFirst).toHaveBeenCalledOnce();
    expect(mocks.projectFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: projectId, estaActivo: true },
      })
    );
  });

  it("no mezcla IDs distintos dentro de una solicitud", async () => {
    mocks.eventFindFirst.mockImplementation(async ({ where }) => ({ id: where.id }));
    const data = await import("@/lib/public-detail-data");
    const firstId = crypto.randomUUID();
    const secondId = crypto.randomUUID();

    await expect(data.getPublicEventDetailForRender(firstId)).resolves.toEqual({ id: firstId });
    await expect(data.getPublicEventDetailForRender(secondId)).resolves.toEqual({ id: secondId });

    expect(mocks.eventFindFirst).toHaveBeenCalledTimes(2);
  });

  it("no reutiliza resultados entre solicitudes independientes", async () => {
    const projectId = crypto.randomUUID();
    mocks.projectFindFirst.mockResolvedValueOnce({ id: projectId, nombre: "Primera solicitud" });
    const firstRequest = await import("@/lib/public-detail-data");
    await expect(firstRequest.getPublicProjectDetailForRender(projectId)).resolves.toMatchObject({
      nombre: "Primera solicitud",
    });

    vi.resetModules();
    mocks.projectFindFirst.mockResolvedValueOnce({ id: projectId, nombre: "Segunda solicitud" });
    const secondRequest = await import("@/lib/public-detail-data");
    await expect(secondRequest.getPublicProjectDetailForRender(projectId)).resolves.toMatchObject({
      nombre: "Segunda solicitud",
    });

    expect(mocks.projectFindFirst).toHaveBeenCalledTimes(2);
  });

  it("conserva como no visibles los recursos inexistentes, cancelados o inactivos", async () => {
    mocks.eventFindFirst.mockResolvedValue(null);
    mocks.projectFindFirst.mockResolvedValue(null);
    const data = await import("@/lib/public-detail-data");

    await expect(data.getPublicEventDetailForRender(crypto.randomUUID())).resolves.toBeNull();
    await expect(data.getPublicProjectDetailForRender(crypto.randomUUID())).resolves.toBeNull();
  });

  it("mantiene filtros, relaciones y ordenamiento de las proyecciones públicas", async () => {
    const eventId = crypto.randomUUID();
    const projectId = crypto.randomUUID();
    mocks.eventFindFirst.mockResolvedValue({ id: eventId, contrataciones: [], entradas: [] });
    mocks.projectFindFirst.mockResolvedValue({ id: projectId, valoraciones: [] });
    const data = await import("@/lib/public-detail-data");

    await data.findPublicEventDetailById(eventId);
    await data.findPublicProjectDetailById(projectId);

    expect(mocks.eventFindFirst).toHaveBeenCalledWith({
      where: { id: eventId, estado: "PUBLICADO" },
      select: expect.objectContaining({
        organizador: expect.any(Object),
        contrataciones: expect.objectContaining({
          where: { estado: { in: ["ACORDADO", "COMPLETADO"] } },
        }),
        entradas: expect.any(Object),
      }),
    });
    expect(mocks.projectFindFirst).toHaveBeenCalledWith({
      where: { id: projectId, estaActivo: true },
      select: expect.objectContaining({
        usuario: expect.any(Object),
        valoraciones: expect.objectContaining({
          orderBy: { creadoEn: "desc" },
          select: expect.objectContaining({ autor: expect.any(Object) }),
        }),
      }),
    });
  });
});
