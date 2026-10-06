import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { usuario: { findUnique: mocks.findUnique } },
}));

import {
  getAuthenticatedUser,
  requireAuthenticatedUser,
} from "@/lib/api-helpers";
import { requireRole } from "@/lib/authorization";
import {
  AuthenticationError,
  AuthorizationError,
  InternalServerError,
  UserProfileNotFoundError,
  normalizeError,
} from "@/lib/errors";
import type { RolUsuario, Usuario } from "@/lib/types";

function supabaseWithGetUser(getUser: ReturnType<typeof vi.fn>) {
  return { auth: { getUser } };
}

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

describe("núcleo de autenticación y autorización", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde como no autenticado cuando no hay sesión", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { name: "AuthSessionMissingError", status: 400 },
    });
    mocks.createClient.mockResolvedValue(supabaseWithGetUser(getUser));

    await expect(requireAuthenticatedUser(new Request("http://localhost/api")))
      .rejects.toBeInstanceOf(AuthenticationError);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("rechaza un Bearer inválido sin hacer fallback a cookies", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { code: "bad_jwt", status: 401 },
    });
    mocks.createClient.mockResolvedValue(supabaseWithGetUser(getUser));
    const request = new Request("http://localhost/api", {
      headers: { Authorization: "Bearer token-invalido" },
    });

    await expect(requireAuthenticatedUser(request)).rejects.toBeInstanceOf(
      AuthenticationError
    );
    expect(getUser).toHaveBeenCalledOnce();
    expect(getUser).toHaveBeenCalledWith("token-invalido");
  });

  it("devuelve 403 conceptual para un rol incorrecto", () => {
    const authenticatedUser = user("MUSICO");

    expect(() => requireRole(authenticatedUser, "ORGANIZADOR")).toThrow(
      AuthorizationError
    );

    try {
      requireRole(authenticatedUser, "ORGANIZADOR");
    } catch (error) {
      expect(error).toMatchObject({ statusCode: 403 });
    }
  });

  it("no convierte un error interno de Supabase en 401", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { name: "AuthRetryableFetchError", status: 503 },
    });
    mocks.createClient.mockResolvedValue(supabaseWithGetUser(getUser));

    await expect(requireAuthenticatedUser()).rejects.toBeInstanceOf(
      InternalServerError
    );
    await expect(getAuthenticatedUser()).rejects.toMatchObject({ statusCode: 500 });
  });

  it("no expone el mensaje de un error inesperado", () => {
    const normalized = normalizeError(new Error("cadena de conexión sensible"));

    expect(normalized).toMatchObject({
      statusCode: 500,
      message: "Error interno del servidor",
    });
    expect(normalized.message).not.toContain("conexión");
  });

  it("ignora x-user-id y nunca lo usa para autenticar", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { name: "AuthSessionMissingError", status: 400 },
    });
    mocks.createClient.mockResolvedValue(supabaseWithGetUser(getUser));
    const request = new Request("http://localhost/api", {
      headers: { "x-user-id": crypto.randomUUID() },
    });

    await expect(requireAuthenticatedUser(request)).rejects.toBeInstanceOf(
      AuthenticationError
    );
    expect(getUser).toHaveBeenCalledWith();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("distingue una identidad válida sin perfil Prisma", async () => {
    const authUserId = crypto.randomUUID();
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: authUserId } },
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabaseWithGetUser(getUser));
    mocks.findUnique.mockResolvedValue(null);

    await expect(requireAuthenticatedUser()).rejects.toBeInstanceOf(
      UserProfileNotFoundError
    );
  });

  it("usa el rol del perfil Prisma luego de validar la identidad", async () => {
    const authenticatedUser = user("ORGANIZADOR");
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: authenticatedUser.id } },
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabaseWithGetUser(getUser));
    mocks.findUnique.mockResolvedValue(authenticatedUser);

    const result = await requireAuthenticatedUser();

    expect(result).toBe(authenticatedUser);
    expect(requireRole(result, "ORGANIZADOR")).toBe(authenticatedUser);
  });
});
