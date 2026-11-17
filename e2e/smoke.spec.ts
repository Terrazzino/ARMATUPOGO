import { test, expect } from "@playwright/test";

test.describe("Smoke Test — Navegación pública", () => {
  test("carga la página principal y muestra el encabezado y buscador", async ({ page }) => {
    await page.goto("/");

    // 1. Verifica encabezado principal orientado a usuario
    const mainHeading = page.getByRole("heading", { level: 1, name: /próximo pogo/i });
    await expect(mainHeading).toBeVisible();

    // 2. Verifica formulario accesible de búsqueda
    const searchForm = page.getByRole("form", { name: "Buscar recitales" });
    await expect(searchForm).toBeVisible();

    // 3. Verifica encabezado de cartelera
    const billboardHeading = page.getByRole("heading", { name: /cartelera de recitales/i });
    await expect(billboardHeading).toBeVisible();
  });

  test("carga la pantalla de login con sus campos accesibles", async ({ page }) => {
    await page.goto("/auth/login");

    const heading = page.getByRole("heading", { name: /iniciar sesión/i });
    await expect(heading).toBeVisible();

    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();

    const passwordInput = page.getByLabel(/contraseña/i);
    await expect(passwordInput).toBeVisible();

    const submitButton = page.getByRole("button", { name: /iniciar sesión/i });
    await expect(submitButton).toBeVisible();
  });
});
