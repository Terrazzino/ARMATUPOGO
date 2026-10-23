import { unstable_doesMiddlewareMatch as doesProxyMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { config, proxy } from "@/proxy";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getUser: vi.fn(),
  renewSession: false,
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));

type CookieBridge = {
  cookies: {
    setAll: (
      cookies: Array<{
        name: string;
        value: string;
        options: { httpOnly?: boolean; path?: string };
      }>,
      headers: Record<string, string>
    ) => void;
  };
};

function request(pathname: string) {
  return new NextRequest(`https://armatu.pogo${pathname}`);
}

function redirectPath(response: Response) {
  const location = response.headers.get("location");
  expect(location).not.toBeNull();
  return new URL(location as string);
}

describe("proxy de autenticación", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    mocks.renewSession = false;
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mocks.createServerClient.mockImplementation((_url, _key, options) => ({
      auth: {
        getUser: async () => {
          if (mocks.renewSession) {
            (options as CookieBridge).cookies.setAll(
              [
                {
                  name: "sb-session",
                  value: "refreshed",
                  options: { httpOnly: true, path: "/" },
                },
              ],
              {
                "cache-control":
                  "private, no-cache, no-store, must-revalidate, max-age=0",
                expires: "0",
                pragma: "no-cache",
              }
            );
          }
          return mocks.getUser();
        },
      },
    }));
  });

  it.each([
    "/api/events",
    "/_next/static/chunks/app.js",
    "/_next/image?url=%2Fbranding%2Flogo.png&w=256&q=75",
    "/favicon.ico",
    "/branding/arma-tu-pogo-logo.png",
    "/branding/armatu_pogo_black_amp_mesh.webp",
    "/branding/fuente.woff2",
  ])("no se ejecuta para el recurso público %s", (url) => {
    expect(doesProxyMatch({ config, url })).toBe(false);
  });

  it.each([
    "/",
    "/events",
    "/auth/login",
    "/dashboard",
    "/dashboard/musician",
    "/dashboard/report.png",
  ])("se ejecuta para la ruta de página %s", (url) => {
    expect(doesProxyMatch({ config, url })).toBe(true);
  });

  it("permite una página pública sin sesión", async () => {
    const response = await proxy(request("/events"));

    expect(response.status).toBe(200);
    expect(mocks.getUser).toHaveBeenCalledOnce();
  });

  it("redirige una ruta protegida cuando no hay sesión", async () => {
    const response = await proxy(request("/dashboard/musician"));

    expect(redirectPath(response).pathname).toBe("/auth/login");
  });

  it("trata una sesión inválida o expirada como no autenticada", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "session expired" },
    });

    const response = await proxy(request("/dashboard"));

    expect(redirectPath(response).pathname).toBe("/auth/login");
  });

  it("permite una ruta protegida con una sesión válida", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const response = await proxy(request("/dashboard"));

    expect(response.status).toBe(200);
  });

  it("redirige al dashboard a un usuario autenticado en una ruta de auth", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const response = await proxy(request("/auth/login"));

    expect(redirectPath(response).pathname).toBe("/dashboard");
  });

  it("conserva la renovación de sesión al redirigir", async () => {
    mocks.renewSession = true;
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const response = await proxy(request("/auth/login"));

    expect(redirectPath(response).pathname).toBe("/dashboard");
    expect(response.cookies.get("sb-session")?.value).toBe("refreshed");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("propaga cookies renovadas y encabezados que impiden cachearlas", async () => {
    mocks.renewSession = true;
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const response = await proxy(request("/dashboard"));

    expect(response.cookies.get("sb-session")?.value).toBe("refreshed");
    expect(response.headers.get("cache-control")).toContain("private");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("pragma")).toBe("no-cache");
  });

  it("deniega una ruta protegida si Supabase no está disponible", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.getUser.mockRejectedValue(new Error("provider unavailable"));

    const response = await proxy(request("/dashboard"));
    const redirect = redirectPath(response);

    expect(redirect.pathname).toBe("/auth/login");
    expect(redirect.searchParams.get("error")).toBe("auth_unavailable");
  });

  it("no expone una ruta protegida si falta la configuración", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");

    const response = await proxy(request("/dashboard"));
    const redirect = redirectPath(response);

    expect(redirect.pathname).toBe("/auth/login");
    expect(redirect.searchParams.get("error")).toBe("config_missing");
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });
});
