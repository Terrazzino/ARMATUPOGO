import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
  revalidatePath: vi.fn(),
  uploadProjectImage: vi.fn(),
  removeProjectImage: vi.fn(),
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
    proyectoMusical: {
      findMany: mocks.findMany,
      findFirst: mocks.findFirst,
      create: mocks.create,
      update: mocks.update,
      deleteMany: mocks.deleteMany,
    },
  },
}));
vi.mock("@/lib/services/project-image-storage", () => ({
  uploadProjectImage: mocks.uploadProjectImage,
  removeProjectImage: mocks.removeProjectImage,
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
import { AuthenticationError } from "@/lib/errors";

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
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.removeProjectImage.mockResolvedValue(true);
    mocks.deleteMany.mockResolvedValue({ count: 1 });
  });

  function imageFormData(input: Record<string, unknown>, action: "keep" | "replace" | "remove", file?: File) {
    const formData = new FormData();
    formData.set("project", JSON.stringify(input));
    formData.set("imageAction", action);
    if (file) formData.set("image", file);
    return formData;
  }

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

  it("cada invocación de una Server Action conserva su validación independiente", async () => {
    const musician = user();
    mocks.requireAuthenticatedUser.mockResolvedValue(musician);
    mocks.create.mockResolvedValue(project(musician.id));
    const input = {
      nombre: "Los Actions",
      genero: "Rock",
      enlacesPersonalizados: [],
    };

    await createProject(input);
    await createProject(input);

    expect(mocks.requireAuthenticatedUser).toHaveBeenCalledTimes(2);
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

  it("rechaza el alta sin sesión antes de acceder a Prisma o Storage", async () => {
    mocks.requireAuthenticatedUser.mockRejectedValue(new AuthenticationError());

    const result = await createProject(imageFormData({ nombre: "Sin sesión", genero: "Rock", enlacesPersonalizados: [] }, "keep"));

    expect(result).toMatchObject({ error: true, code: "AUTHENTICATION_ERROR" });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.uploadProjectImage).not.toHaveBeenCalled();
  });

  it("crea sin imagen sin depender de Storage", async () => {
    const musician = user();
    mocks.requireAuthenticatedUser.mockResolvedValue(musician);
    mocks.create.mockResolvedValue(project(musician.id));

    const result = await createProject(imageFormData({ nombre: "Sin Imagen", genero: "Rock", enlacesPersonalizados: [] }, "keep"));

    expect(result).toMatchObject({ success: true });
    expect(mocks.uploadProjectImage).not.toHaveBeenCalled();
  });

  it("crea una fila provisional propia antes de subir y luego activa el proyecto", async () => {
    const musician = user();
    const file = new File([new Uint8Array([1])], "logo.png", { type: "image/png" });
    const provisional = project(musician.id, false);
    const activated = { ...provisional, estaActivo: true, imagenUrl: "https://example.supabase.co/storage/v1/object/public/project-images/file.png" };
    mocks.requireAuthenticatedUser.mockResolvedValue(musician);
    mocks.uploadProjectImage.mockResolvedValue({ path: `${musician.id}/projects/id/file.png`, publicUrl: "https://example.supabase.co/storage/v1/object/public/project-images/file.png" });
    mocks.create.mockResolvedValue(provisional);
    mocks.update.mockResolvedValue(activated);

    const result = await createProject(imageFormData({ nombre: "Con Imagen", genero: "Rock", enlacesPersonalizados: [] }, "replace", file));

    expect(result).toMatchObject({ success: true });
    expect(mocks.uploadProjectImage).toHaveBeenCalledOnce();
    expect(mocks.create).toHaveBeenCalledWith({ data: expect.objectContaining({ imagenUrl: null, estaActivo: false, usuarioId: musician.id }) });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: { imagenUrl: expect.stringContaining("project-images"), estaActivo: true } }));
    const provisionalId = mocks.create.mock.calls[0][0].data.id;
    expect(mocks.uploadProjectImage).toHaveBeenCalledWith(musician.id, provisionalId, file);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: provisionalId, usuarioId: musician.id } }));
    expect(mocks.create.mock.invocationCallOrder[0]).toBeLessThan(mocks.uploadProjectImage.mock.invocationCallOrder[0]);
    expect(mocks.uploadProjectImage.mock.invocationCallOrder[0]).toBeLessThan(mocks.update.mock.invocationCallOrder[0]);
  });

  it("no intenta Storage si falla la creación de la fila provisional", async () => {
    const musician = user();
    const file = new File([new Uint8Array([1])], "logo.png", { type: "image/png" });
    mocks.requireAuthenticatedUser.mockResolvedValue(musician);
    mocks.create.mockRejectedValue(new Error("database unavailable"));

    const result = await createProject(imageFormData({ nombre: "Con Imagen", genero: "Rock", enlacesPersonalizados: [] }, "replace", file));

    expect(result).toMatchObject({ error: true });
    expect(mocks.uploadProjectImage).not.toHaveBeenCalled();
    expect(mocks.removeProjectImage).not.toHaveBeenCalled();
  });

  it("elimina la fila provisional si falla Storage durante el alta", async () => {
    const musician = user();
    const provisional = project(musician.id, false);
    const file = new File([new Uint8Array([1])], "logo.png", { type: "image/png" });
    mocks.requireAuthenticatedUser.mockResolvedValue(musician);
    mocks.create.mockResolvedValue(provisional);
    mocks.uploadProjectImage.mockRejectedValue(new Error("storage unavailable"));

    const result = await createProject(imageFormData({ nombre: "Con Imagen", genero: "Rock", enlacesPersonalizados: [] }, "replace", file));

    expect(result).toMatchObject({ error: true });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: expect.objectContaining({ usuarioId: musician.id, estaActivo: false, imagenUrl: null }) });
  });

  it("elimina el archivo y la fila provisional si falla la activación final", async () => {
    const musician = user();
    const provisional = project(musician.id, false);
    const path = `${musician.id}/projects/${provisional.id}/${crypto.randomUUID()}.png`;
    const file = new File([new Uint8Array([1])], "logo.png", { type: "image/png" });
    mocks.requireAuthenticatedUser.mockResolvedValue(musician);
    mocks.create.mockResolvedValue(provisional);
    mocks.uploadProjectImage.mockResolvedValue({ path, publicUrl: "https://example.test/image.png" });
    mocks.update.mockRejectedValue(new Error("database unavailable"));

    const result = await createProject(imageFormData({ nombre: "Con Imagen", genero: "Rock", enlacesPersonalizados: [] }, "replace", file));

    expect(result).toMatchObject({ error: true });
    expect(mocks.removeProjectImage).toHaveBeenCalledWith(path);
    expect(mocks.deleteMany).toHaveBeenCalledOnce();
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

  it("edita sin cambiar la imagen y sin invocar Storage", async () => {
    const musician = user();
    const owned = { ...project(musician.id), imagenUrl: "https://example.test/current.webp" };
    mocks.requireAuthenticatedUser.mockResolvedValue(musician);
    mocks.findFirst.mockResolvedValue(owned);
    mocks.update.mockResolvedValue({ ...owned, nombre: "Actualizado" });

    const result = await updateProject(owned.id, imageFormData({ nombre: "Actualizado" }, "keep"));

    expect(result).toMatchObject({ success: true });
    expect(mocks.uploadProjectImage).not.toHaveBeenCalled();
    expect(mocks.removeProjectImage).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ nombre: "Actualizado" }) }));
  });

  it("permite guardar el mismo contenido sin seleccionar archivo", async () => {
    const musician = user();
    const owned = { ...project(musician.id), descripcion: "Sin cambios", imagenUrl: null };
    mocks.requireAuthenticatedUser.mockResolvedValue(musician);
    mocks.findFirst.mockResolvedValue(owned);
    mocks.update.mockResolvedValue(owned);

    const result = await updateProject(owned.id, imageFormData({
      nombre: owned.nombre,
      genero: owned.genero,
      descripcion: owned.descripcion,
      enlacesPersonalizados: [],
    }, "keep"));

    expect(result).toMatchObject({ success: true });
    expect(mocks.uploadProjectImage).not.toHaveBeenCalled();
  });

  it("rechaza un ID inválido antes de consultar ownership", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue(user());

    const result = await updateProject("no-es-un-uuid", { nombre: "Actualizado" });

    expect(result).toMatchObject({ error: true, code: "VALIDATION_ERROR" });
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.uploadProjectImage).not.toHaveBeenCalled();
  });

  it("rechaza propiedades adicionales sin iniciar una carga", async () => {
    const musician = user();
    const owned = project(musician.id);
    const file = new File([new Uint8Array([1])], "logo.png", { type: "image/png" });
    mocks.requireAuthenticatedUser.mockResolvedValue(musician);
    mocks.findFirst.mockResolvedValue(owned);

    const result = await updateProject(owned.id, imageFormData({
      nombre: "Actualizado",
      id: crypto.randomUUID(),
      usuarioId: crypto.randomUUID(),
    }, "replace", file));

    expect(result).toMatchObject({ error: true, code: "VALIDATION_ERROR" });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.uploadProjectImage).not.toHaveBeenCalled();
  });

  it("impide que un organizador edite o suba una imagen de proyecto", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue(user("ORGANIZADOR"));
    const file = new File([new Uint8Array([1])], "logo.png", { type: "image/png" });

    const result = await updateProject(crypto.randomUUID(), imageFormData({ nombre: "Ataque" }, "replace", file));

    expect(result).toMatchObject({ error: true, code: "AUTHORIZATION_ERROR" });
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.uploadProjectImage).not.toHaveBeenCalled();
  });

  it("trata un proyecto ajeno como no encontrado", async () => {
    const musician = user();
    mocks.requireAuthenticatedUser.mockResolvedValue(musician);
    mocks.findFirst.mockResolvedValue(null);

    const result = await updateProject(crypto.randomUUID(), { nombre: "Actualizado" });

    expect(result).toMatchObject({ error: true, code: "NOT_FOUND" });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.uploadProjectImage).not.toHaveBeenCalled();
  });

  it("reemplaza la referencia antes de eliminar la imagen anterior", async () => {
    const musician = user();
    const id = crypto.randomUUID();
    const oldPath = `${musician.id}/projects/${id}/11111111-1111-4111-8111-111111111111.png`;
    const oldUrl = `https://example.supabase.co/storage/v1/object/public/project-images/${oldPath}`;
    const newPath = `${musician.id}/projects/${id}/22222222-2222-4222-8222-222222222222.webp`;
    const file = new File([new Uint8Array([1])], "nuevo.webp", { type: "image/webp" });
    mocks.requireAuthenticatedUser.mockResolvedValue(musician);
    mocks.findFirst.mockResolvedValue({ ...project(musician.id), id, imagenUrl: oldUrl });
    mocks.uploadProjectImage.mockResolvedValue({ path: newPath, publicUrl: "https://example.test/new.webp" });
    mocks.update.mockResolvedValue({ id, imagenUrl: "https://example.test/new.webp" });

    const result = await updateProject(id, imageFormData({ nombre: "Actualizado" }, "replace", file));

    expect(result).toMatchObject({ success: true });
    expect(mocks.update.mock.invocationCallOrder[0]).toBeLessThan(mocks.removeProjectImage.mock.invocationCallOrder[0]);
    expect(mocks.removeProjectImage).toHaveBeenCalledWith(oldPath);
  });

  it("conserva la imagen anterior y no actualiza si falla la subida", async () => {
    const musician = user();
    const owned = { ...project(musician.id), imagenUrl: "https://images.example.com/current.png" };
    mocks.requireAuthenticatedUser.mockResolvedValue(musician);
    mocks.findFirst.mockResolvedValue(owned);
    mocks.uploadProjectImage.mockRejectedValue(new Error("storage unavailable"));

    const file = new File([new Uint8Array([1])], "logo.png", { type: "image/png" });
    const result = await updateProject(owned.id, imageFormData({ nombre: "Sin cambio" }, "replace", file));

    expect(result).toMatchObject({ error: true });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.removeProjectImage).not.toHaveBeenCalled();
  });

  it("elimina el objeto nuevo si falla la actualización", async () => {
    const musician = user();
    const owned = project(musician.id);
    const newPath = `${musician.id}/projects/${owned.id}/22222222-2222-4222-8222-222222222222.png`;
    mocks.requireAuthenticatedUser.mockResolvedValue(musician);
    mocks.findFirst.mockResolvedValue(owned);
    mocks.uploadProjectImage.mockResolvedValue({ path: newPath, publicUrl: "https://example.test/new.png" });
    mocks.update.mockRejectedValue(new Error("database unavailable"));

    const file = new File([new Uint8Array([1])], "logo.png", { type: "image/png" });
    const result = await updateProject(owned.id, imageFormData({ nombre: "Sin cambio" }, "replace", file));

    expect(result).toMatchObject({ error: true });
    expect(mocks.removeProjectImage).toHaveBeenCalledWith(newPath);
  });

  it("quita la referencia y luego elimina sólo un objeto administrado propio", async () => {
    const musician = user();
    const id = crypto.randomUUID();
    const path = `${musician.id}/projects/${id}/11111111-1111-4111-8111-111111111111.jpg`;
    mocks.requireAuthenticatedUser.mockResolvedValue(musician);
    mocks.findFirst.mockResolvedValue({ ...project(musician.id), id, imagenUrl: `https://example.supabase.co/storage/v1/object/public/project-images/${path}` });
    mocks.update.mockResolvedValue({ id, imagenUrl: null });

    await updateProject(id, imageFormData({ nombre: "Sin logo" }, "remove"));

    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ imagenUrl: null }) }));
    expect(mocks.removeProjectImage).toHaveBeenCalledWith(path);
  });

  it("no intenta eliminar una URL que no pertenece al usuario autenticado", async () => {
    const musician = user();
    const id = crypto.randomUUID();
    const foreignPath = `${crypto.randomUUID()}/projects/${id}/${crypto.randomUUID()}.jpg`;
    mocks.requireAuthenticatedUser.mockResolvedValue(musician);
    mocks.findFirst.mockResolvedValue({ ...project(musician.id), id, imagenUrl: `https://example.supabase.co/storage/v1/object/public/project-images/${foreignPath}` });
    mocks.update.mockResolvedValue({ id, imagenUrl: null });

    const result = await updateProject(id, imageFormData({ nombre: "Sin logo" }, "remove"));

    expect(result).toMatchObject({ success: true });
    expect(mocks.removeProjectImage).not.toHaveBeenCalled();
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
      expect.objectContaining({
        where: { id: projectId, estaActivo: true },
        select: expect.objectContaining({
          valoraciones: expect.objectContaining({
            orderBy: { creadoEn: "desc" },
          }),
        }),
      })
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
