import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/api-helpers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api-helpers")>()),
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    proyectoMusical: {
      findMany: mocks.findMany,
      findFirst: mocks.findFirst,
      create: mocks.create,
      update: mocks.update,
    },
  },
}));

import {
  createProject,
  getMyProjects,
  getProjectById,
  getPublicProjects,
  toggleProjectStatus,
  updateProject,
} from "@/app/actions/projects";
import type { RolUsuario, Usuario } from "@/lib/types";

function user(role: RolUsuario = "MUSICO"): Usuario {
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

function project(ownerId: string, active = true) {
  return {
    id: crypto.randomUUID(),
    usuarioId: ownerId,
    nombre: "Los Actions",
    genero: "Rock",
    estaActivo: active,
  };
}

describe("Server Actions de proyectos", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crea el proyecto con el usuario autenticado", async () => {
    const musician = user();
    const created = project(musician.id);
    mocks.requireAuthenticatedUser.mockResolvedValue(musician);
    mocks.create.mockResolvedValue(created);

    const result = await createProject({
      nombre: "Los Actions",
      genero: "Rock",
      enlacesPersonalizados: [],
    });

    expect(result).toMatchObject({ success: true });
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ usuarioId: musician.id }),
    });
  });

  it("rechaza con 403 a un ORGANIZADOR", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue(user("ORGANIZADOR"));

    const result = await createProject({
      nombre: "Los Actions",
      genero: "Rock",
      enlacesPersonalizados: [],
    });

    expect(result).toMatchObject({ error: true, code: "AUTHORIZATION_ERROR" });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("lista solamente proyectos propios", async () => {
    const musician = user();
    mocks.requireAuthenticatedUser.mockResolvedValue(musician);
    mocks.findMany.mockResolvedValue([]);

    await getMyProjects();

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { usuarioId: musician.id } })
    );
  });

  it("actualiza un proyecto propio usando ownership en la consulta", async () => {
    const musician = user();
    const owned = project(musician.id);
    mocks.requireAuthenticatedUser.mockResolvedValue(musician);
    mocks.findFirst.mockResolvedValue(owned);
    mocks.update.mockResolvedValue({ ...owned, nombre: "Actualizado" });

    const result = await updateProject(owned.id, { nombre: "Actualizado" });

    expect(result).toMatchObject({ success: true });
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { id: owned.id, usuarioId: musician.id },
    });
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: owned.id, usuarioId: musician.id } })
    );
  });

  it("trata un proyecto ajeno como no encontrado", async () => {
    const musician = user();
    mocks.requireAuthenticatedUser.mockResolvedValue(musician);
    mocks.findFirst.mockResolvedValue(null);

    const result = await updateProject(crypto.randomUUID(), { nombre: "Actualizado" });

    expect(result).toMatchObject({ error: true, code: "NOT_FOUND" });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("aplica ownership al activar o desactivar", async () => {
    const musician = user();
    const owned = project(musician.id);
    mocks.requireAuthenticatedUser.mockResolvedValue(musician);
    mocks.findFirst.mockResolvedValue(owned);
    mocks.update.mockResolvedValue({ ...owned, estaActivo: false });

    const result = await toggleProjectStatus(owned.id);

    expect(result).toMatchObject({ success: true });
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: owned.id, usuarioId: musician.id },
      data: { estaActivo: false },
    });
  });

  it("el detalle usado por la UI pública exige proyecto activo", async () => {
    const projectId = crypto.randomUUID();
    mocks.findFirst.mockResolvedValue(null);

    expect(await getProjectById(projectId)).toBeNull();
    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: projectId, estaActivo: true } })
    );
  });

  it("el catálogo usado por la UI siempre filtra activos", async () => {
    mocks.findMany.mockResolvedValue([]);

    await getPublicProjects({ search: "Rock" });

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ estaActivo: true }),
      })
    );
  });
});
