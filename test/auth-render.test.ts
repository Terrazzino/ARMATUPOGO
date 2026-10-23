import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RolUsuario, Usuario } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
}));

// Simula el almacén que React crea para una solicitud de render. Cada
// vi.resetModules() representa una solicitud nueva con un almacén aislado.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    cache: (operation: (...args: never[]) => unknown) => {
      let initialized = false;
      let result: unknown;
      return (...args: never[]) => {
        if (!initialized) {
          initialized = true;
          result = operation(...args);
        }
        return result;
      };
    },
  };
});

vi.mock("@/lib/api-helpers", () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}));

function user(role: RolUsuario): Usuario {
  return {
    id: crypto.randomUUID(),
    email: `${role.toLowerCase()}@example.com`,
    nombre: "Nombre",
    apellido: "Apellido",
    rol: role,
    creadoEn: new Date(),
    actualizadoEn: new Date(),
  };
}

describe("identidad deduplicada durante el render", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it.each(["MUSICO", "ORGANIZADOR"] as const)(
    "reutiliza una sola verificación para un %s dentro de la misma solicitud",
    async (role) => {
      const authenticatedUser = user(role);
      mocks.getAuthenticatedUser.mockResolvedValue(authenticatedUser);
      const auth = await import("@/lib/auth-render");

      const [optionalUser, requiredUser, repeatedUser] = await Promise.all([
        auth.getAuthenticatedUserForRender(),
        auth.requireAuthenticatedUserForRender(),
        auth.getAuthenticatedUserForRender(),
      ]);

      expect(optionalUser).toBe(authenticatedUser);
      expect(requiredUser).toBe(authenticatedUser);
      expect(repeatedUser).toBe(authenticatedUser);
      expect(mocks.getAuthenticatedUser).toHaveBeenCalledOnce();
    }
  );

  it("mantiene el resultado sin sesión dentro del render y deniega el acceso", async () => {
    mocks.getAuthenticatedUser.mockResolvedValue(null);
    const auth = await import("@/lib/auth-render");

    await expect(auth.getAuthenticatedUserForRender()).resolves.toBeNull();
    await expect(auth.requireAuthenticatedUserForRender()).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(mocks.getAuthenticatedUser).toHaveBeenCalledOnce();
  });

  it("no reutiliza la identidad entre dos solicitudes diferentes", async () => {
    const musician = user("MUSICO");
    const organizer = user("ORGANIZADOR");
    mocks.getAuthenticatedUser.mockResolvedValueOnce(musician);

    const firstRequest = await import("@/lib/auth-render");
    await expect(firstRequest.getAuthenticatedUserForRender()).resolves.toBe(musician);

    vi.resetModules();
    mocks.getAuthenticatedUser.mockResolvedValueOnce(organizer);
    const secondRequest = await import("@/lib/auth-render");
    await expect(secondRequest.getAuthenticatedUserForRender()).resolves.toBe(organizer);

    expect(mocks.getAuthenticatedUser).toHaveBeenCalledTimes(2);
  });
});
