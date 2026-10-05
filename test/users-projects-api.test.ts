import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  usuarioUpdate: vi.fn(),
  projectFindMany: vi.fn(),
  projectFindFirst: vi.fn(),
  projectCreate: vi.fn(),
  projectUpdate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    usuario: { update: mocks.usuarioUpdate },
    proyectoMusical: {
      findMany: mocks.projectFindMany,
      findFirst: mocks.projectFindFirst,
      create: mocks.projectCreate,
      update: mocks.projectUpdate,
    },
  },
}));

vi.mock("@/lib/api-helpers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api-helpers")>()),
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

import { AuthenticationError } from "@/lib/errors";
import type { RolUsuario, Usuario } from "@/lib/types";
import { GET as getMe, PATCH as patchMe } from "@/app/api/usuarios/me/route";
import { GET as listProjects, POST as createProject } from "@/app/api/proyectos/route";
import {
  DELETE as deleteProject,
  GET as getPrivateProject,
  PATCH as patchProject,
} from "@/app/api/proyectos/[proyectoId]/route";
import { GET as searchProjects } from "@/app/api/proyectos/buscar/route";
import { GET as getPublicProject } from "@/app/api/publico/proyectos/[proyectoId]/route";

function user(role: RolUsuario = "MUSICO"): Usuario {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    email: "persona@example.com",
    nombre: "Nombre",
    apellido: "Apellido",
    rol: role,
    creadoEn: now,
    actualizadoEn: now,
  };
}

function project(ownerId = crypto.randomUUID(), active = true) {
  return {
    id: crypto.randomUUID(),
    usuarioId: ownerId,
    nombre: "Los Testers",
    genero: "Rock",
    descripcion: null,
    cacheAproximado: null,
    ubicacion: null,
    ciudad: null,
    imagenUrl: null,
    spotifyUrl: null,
    youtubeUrl: null,
    instagramUrl: null,
    sitioWebUrl: null,
    enlacesPersonalizados: [],
    estaActivo: active,
    creadoEn: new Date(),
    actualizadoEn: new Date(),
  };
}

function request(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(url, init);
}

function params(proyectoId: string) {
  return { params: Promise.resolve({ proyectoId }) };
}

describe("API de usuario propio", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET /usuarios/me sin sesión devuelve 401", async () => {
    mocks.requireAuthenticatedUser.mockRejectedValue(new AuthenticationError());

    const response = await getMe(request("http://localhost/api/usuarios/me"));

    expect(response.status).toBe(401);
  });

  it("GET /usuarios/me devuelve exclusivamente el perfil autenticado", async () => {
    const currentUser = user();
    mocks.requireAuthenticatedUser.mockResolvedValue(currentUser);

    const response = await getMe(request("http://localhost/api/usuarios/me"));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: currentUser.id });
  });

  it.each([{ rol: "ORGANIZADOR" }, { id: crypto.randomUUID() }])(
    "PATCH /usuarios/me rechaza campos protegidos: %o",
    async (protectedField) => {
      mocks.requireAuthenticatedUser.mockResolvedValue(user());
      const response = await patchMe(
        request("http://localhost/api/usuarios/me", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ nombre: "Nombre válido", ...protectedField }),
        })
      );

      expect(response.status).toBe(400);
      expect(mocks.usuarioUpdate).not.toHaveBeenCalled();
    }
  );
});

describe("API privada de proyectos", () => {
  beforeEach(() => vi.clearAllMocks());

  it("un MUSICO lista solamente sus proyectos", async () => {
    const musician = user();
    mocks.requireAuthenticatedUser.mockResolvedValue(musician);
    mocks.projectFindMany.mockResolvedValue([project(musician.id)]);

    const response = await listProjects(request("http://localhost/api/proyectos"));

    expect(response.status).toBe(200);
    expect(mocks.projectFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { usuarioId: musician.id } })
    );
  });

  it("un ORGANIZADOR no puede listar proyectos privados", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue(user("ORGANIZADOR"));

    const response = await listProjects(request("http://localhost/api/proyectos"));

    expect(response.status).toBe(403);
    expect(mocks.projectFindMany).not.toHaveBeenCalled();
  });

  it("un MUSICO crea un proyecto cuyo usuarioId proviene de la sesión", async () => {
    const musician = user();
    const created = project(musician.id);
    mocks.requireAuthenticatedUser.mockResolvedValue(musician);
    mocks.projectCreate.mockResolvedValue(created);

    const response = await createProject(
      request("http://localhost/api/proyectos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nombre: "Los Testers", genero: "Rock" }),
      })
    );

    expect(response.status).toBe(201);
    expect(mocks.projectCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ usuarioId: musician.id, estaActivo: true }),
    });
  });

  it("un ORGANIZADOR no puede crear proyectos", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue(user("ORGANIZADOR"));

    const response = await createProject(
      request("http://localhost/api/proyectos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nombre: "Los Testers", genero: "Rock" }),
      })
    );

    expect(response.status).toBe(403);
    expect(mocks.projectCreate).not.toHaveBeenCalled();
  });

  it("rechaza un usuarioId enviado en el cuerpo", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue(user());

    const response = await createProject(
      request("http://localhost/api/proyectos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nombre: "Los Testers",
          genero: "Rock",
          usuarioId: crypto.randomUUID(),
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.projectCreate).not.toHaveBeenCalled();
  });

  it("un MUSICO modifica un proyecto propio", async () => {
    const musician = user();
    const owned = project(musician.id);
    mocks.requireAuthenticatedUser.mockResolvedValue(musician);
    mocks.projectFindFirst.mockResolvedValue(owned);
    mocks.projectUpdate.mockResolvedValue({ ...owned, nombre: "Nombre actualizado" });

    const response = await patchProject(
      request(`http://localhost/api/proyectos/${owned.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nombre: "Nombre actualizado" }),
      }),
      params(owned.id)
    );

    expect(response.status).toBe(200);
    expect(mocks.projectFindFirst).toHaveBeenCalledWith({
      where: { id: owned.id, usuarioId: musician.id },
    });
    expect(mocks.projectUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: owned.id, usuarioId: musician.id } })
    );
  });

  it.each(["ajeno", "inexistente"])(
    "PATCH devuelve el mismo 404 para proyecto %s",
    async () => {
      const musician = user();
      const projectId = crypto.randomUUID();
      mocks.requireAuthenticatedUser.mockResolvedValue(musician);
      mocks.projectFindFirst.mockResolvedValue(null);

      const response = await patchProject(
        request(`http://localhost/api/proyectos/${projectId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ nombre: "Nombre actualizado" }),
        }),
        params(projectId)
      );

      expect(response.status).toBe(404);
      expect(mocks.projectUpdate).not.toHaveBeenCalled();
    }
  );

  it("un MUSICO desactiva un proyecto propio mediante baja lógica", async () => {
    const musician = user();
    const owned = project(musician.id);
    mocks.requireAuthenticatedUser.mockResolvedValue(musician);
    mocks.projectFindFirst.mockResolvedValue(owned);
    mocks.projectUpdate.mockResolvedValue({ ...owned, estaActivo: false });

    const response = await deleteProject(
      request(`http://localhost/api/proyectos/${owned.id}`, { method: "DELETE" }),
      params(owned.id)
    );

    expect(response.status).toBe(200);
    expect(mocks.projectUpdate).toHaveBeenCalledWith({
      where: { id: owned.id, usuarioId: musician.id },
      data: { estaActivo: false },
    });
  });

  it("DELETE de un proyecto ajeno devuelve 404", async () => {
    const musician = user();
    const projectId = crypto.randomUUID();
    mocks.requireAuthenticatedUser.mockResolvedValue(musician);
    mocks.projectFindFirst.mockResolvedValue(null);

    const response = await deleteProject(
      request(`http://localhost/api/proyectos/${projectId}`, { method: "DELETE" }),
      params(projectId)
    );

    expect(response.status).toBe(404);
    expect(mocks.projectUpdate).not.toHaveBeenCalled();
  });

  it("el detalle privado permite al dueño consultar un proyecto inactivo", async () => {
    const musician = user();
    const inactive = project(musician.id, false);
    mocks.requireAuthenticatedUser.mockResolvedValue(musician);
    mocks.projectFindFirst.mockResolvedValue(inactive);

    const response = await getPrivateProject(
      request(`http://localhost/api/proyectos/${inactive.id}`),
      params(inactive.id)
    );

    expect(response.status).toBe(200);
    expect(mocks.projectFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: inactive.id, usuarioId: musician.id },
      })
    );
  });
});

describe("API pública de proyectos", () => {
  beforeEach(() => vi.clearAllMocks());

  it("permite buscar sin sesión y filtra siempre por proyectos activos", async () => {
    mocks.projectFindMany.mockResolvedValue([project()]);

    const response = await searchProjects(
      request("http://localhost/api/proyectos/buscar?genero=Rock")
    );

    expect(response.status).toBe(200);
    expect(mocks.requireAuthenticatedUser).not.toHaveBeenCalled();
    expect(mocks.projectFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ estaActivo: true }),
      })
    );
  });

  it("devuelve el detalle de un proyecto activo", async () => {
    const active = project();
    mocks.projectFindFirst.mockResolvedValue(active);

    const response = await getPublicProject(
      request(`http://localhost/api/publico/proyectos/${active.id}`),
      params(active.id)
    );

    expect(response.status).toBe(200);
    expect(mocks.projectFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: active.id, estaActivo: true } })
    );
  });

  it.each(["inactivo", "inexistente"])(
    "devuelve 404 para un proyecto %s",
    async () => {
      const projectId = crypto.randomUUID();
      mocks.projectFindFirst.mockResolvedValue(null);

      const response = await getPublicProject(
        request(`http://localhost/api/publico/proyectos/${projectId}`),
        params(projectId)
      );

      expect(response.status).toBe(404);
    }
  );
});
