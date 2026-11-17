import { test, expect } from "@playwright/test";
import {
  createOrResetTestUser,
  createTestEvent,
  cleanupTestUsers,
  type TestUserData,
} from "./preparar";
import { loginAsMusician, loginAsOrganizer } from "./sesiones";

const USUARIO_MUSICO: TestUserData = {
  email: "musico.roles@armatupogo.local",
  password: "Password123!",
  nombre: "Músico",
  apellido: "Roles",
  rol: "MUSICO",
};

const USUARIO_ORGANIZADOR: TestUserData = {
  email: "organizador.roles@armatupogo.local",
  password: "Password123!",
  nombre: "Organizador",
  apellido: "Roles",
  rol: "ORGANIZADOR",
};

const OTRO_ORGANIZADOR: TestUserData = {
  email: "otro.organizador.roles@armatupogo.local",
  password: "Password123!",
  nombre: "Otro",
  apellido: "Organizador",
  rol: "ORGANIZADOR",
};

test.describe("Permisos y control de acceso por rol (Clase 13 MDW)", () => {
  test.beforeAll(async () => {
    // Preparar usuarios limpios en Supabase Auth y PostgreSQL
    await createOrResetTestUser(USUARIO_MUSICO);
    await createOrResetTestUser(USUARIO_ORGANIZADOR);
    await createOrResetTestUser(OTRO_ORGANIZADOR);
  });

  test.afterAll(async () => {
    // Limpieza de datos al finalizar
    await cleanupTestUsers([
      USUARIO_MUSICO.email,
      USUARIO_ORGANIZADOR.email,
      OTRO_ORGANIZADOR.email,
    ]);
  });

  test.describe("1. Usuario público (no autenticado)", () => {
    test("puede ver la cartelera y el home público sin restricciones", async ({
      page,
    }) => {
      await page.goto("/");
      await expect(
        page.getByRole("heading", { level: 1, name: /próximo pogo/i })
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: /cartelera de recitales/i })
      ).toBeVisible();
    });

    test("redirecciona al login al intentar acceder a rutas privadas de dashboard", async ({
      page,
    }) => {
      // 1. Dashboard raíz
      await page.goto("/dashboard");
      await page.waitForURL(/\/auth\/login/, { timeout: 10000 });
      await expect(page.getByRole("heading", { name: /iniciar sesión/i })).toBeVisible();

      // 2. Dashboard de músico
      await page.goto("/dashboard/musician");
      await page.waitForURL(/\/auth\/login/, { timeout: 10000 });

      // 3. Dashboard de organizador
      await page.goto("/dashboard/organizer");
      await page.waitForURL(/\/auth\/login/, { timeout: 10000 });
    });

    test("las APIs de creación rechazan solicitudes sin autenticación con 401", async ({
      request,
    }) => {
      const resEventos = await request.post("/api/eventos", {
        data: { titulo: "Intento no autenticado" },
      });
      expect(resEventos.status()).toBe(401);

      const resProyectos = await request.post("/api/proyectos", {
        data: { nombre: "Intento no autenticado" },
      });
      expect(resProyectos.status()).toBe(401);
    });
  });

  test.describe("2. Usuario con rol MÚSICO", () => {
    test("inicia sesión y accede a su panel pero no al panel de organizador", async ({
      page,
    }) => {
      await loginAsMusician(page, USUARIO_MUSICO);

      // Confirma que está en el panel de músico
      await expect(page.getByText(/panel de músico/i)).toBeVisible();
      await expect(
        page.getByRole("heading", { name: /hola/i })
      ).toBeVisible();

      // Intento de navegar directamente al panel de organizador: debe ser redirigido
      await page.goto("/dashboard/organizer");
      await page.waitForURL(/\/dashboard\/musician/, { timeout: 10000 });
      await expect(page.getByText(/panel de músico/i)).toBeVisible();
    });

    test("la API rechaza con 403 Forbidden si el músico intenta crear un evento", async ({
      page,
    }) => {
      await loginAsMusician(page, USUARIO_MUSICO);

      // Usar la sesión autenticada del músico para intentar crear un evento
      const response = await page.request.post("/api/eventos", {
        data: {
          titulo: "Evento ilegal por Músico",
          startsAt: new Date(Date.now() + 86400000).toISOString(),
          endsAt: new Date(Date.now() + 90000000).toISOString(),
          ubicacion: "Lugar 123",
          precioEntrada: 1000,
          cantidadMusicosRequerida: 1,
        },
      });

      expect(response.status()).toBe(403);
    });
  });

  test.describe("3. Usuario con rol ORGANIZADOR", () => {
    test("inicia sesión y accede a su panel pero no al panel de músico", async ({
      page,
    }) => {
      await loginAsOrganizer(page, USUARIO_ORGANIZADOR);

      // Confirma que está en el panel de organizador
      await expect(page.getByText(/panel de organizador/i)).toBeVisible();
      await expect(
        page.getByRole("heading", { name: /hola/i })
      ).toBeVisible();

      // Intento de navegar directamente al panel de músico: debe ser redirigido
      await page.goto("/dashboard/musician");
      await page.waitForURL(/\/dashboard\/organizer/, { timeout: 10000 });
      await expect(page.getByText(/panel de organizador/i)).toBeVisible();
    });

    test("la API rechaza con 403 Forbidden si el organizador intenta crear un proyecto musical", async ({
      page,
    }) => {
      await loginAsOrganizer(page, USUARIO_ORGANIZADOR);

      // Usar la sesión autenticada del organizador para intentar crear un proyecto
      const response = await page.request.post("/api/proyectos", {
        data: {
          nombre: "Banda Ilegal por Organizador",
          genero: "Rock",
        },
      });

      expect(response.status()).toBe(403);
    });

    test("el organizador no puede modificar eventos de otro organizador (retorna 404/403)", async ({
      page,
    }) => {
      // 1. Crear un evento que pertenece a OTRO organizador
      const otroUser = await createOrResetTestUser(OTRO_ORGANIZADOR);
      const eventoAjeno = await createTestEvent({
        organizadorId: otroUser.id,
        titulo: "Evento del Otro Organizador",
        startsAt: new Date(Date.now() + 86400000),
        endsAt: new Date(Date.now() + 90000000),
      });

      // 2. Iniciar sesión como el Organizador principal
      await loginAsOrganizer(page, USUARIO_ORGANIZADOR);

      // 3. Intentar modificar el evento ajeno vía PATCH
      const patchResponse = await page.request.patch(
        `/api/eventos/${eventoAjeno.id}`,
        {
          data: {
            titulo: "Título modificado sin permiso",
          },
        }
      );

      // Debe responder 404 (evento no encontrado dentro de los pertenecientes al usuario) o 403
      expect([403, 404]).toContain(patchResponse.status());
    });
  });
});

