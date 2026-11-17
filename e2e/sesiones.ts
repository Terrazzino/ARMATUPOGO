import { expect, type Page } from "@playwright/test";
import type { TestUserData } from "./preparar";

/**
 * Inicia sesión real a través de la pantalla accesible /auth/login.
 * Completa los campos de email y contraseña, envía el formulario y espera
 * que la aplicación redirija fuera del flujo de autenticación.
 */
export async function loginViaUI(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  // Asegura contexto limpio para que proxy.ts no redirija /auth/login hacia /dashboard
  await page.context().clearCookies();

  await page.goto("/auth/login");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle");

  const emailInput = page.getByLabel(/email/i);
  await expect(emailInput).toBeVisible();
  await emailInput.fill(email);

  const passwordInput = page.getByLabel(/contraseña/i);
  await passwordInput.fill(password);

  const submitButton = page.getByRole("button", { name: /iniciar sesión/i });
  await expect(submitButton).toBeEnabled();

  try {
    await Promise.all([
      page.waitForURL((url) => !url.pathname.startsWith("/auth"), {
        timeout: 20000,
      }),
      submitButton.click(),
    ]);
  } catch (err) {
    const alerts = await page
      .locator('[role="alert"], [role="status"]')
      .allInnerTexts();
    const currentUrl = page.url();
    console.error(
      `Login falló para ${email}. URL actual: ${currentUrl}. Mensajes en pantalla:`,
      alerts
    );
    throw err;
  }
}

/**
 * Inicia sesión como usuario con rol MÚSICO y confirma llegada a /dashboard/musician.
 */
export async function loginAsMusician(
  page: Page,
  user: Pick<TestUserData, "email" | "password">
): Promise<void> {
  await loginViaUI(page, user.email, user.password);
  await page.waitForURL(/\/dashboard\/musician/, { timeout: 15000 });
}

/**
 * Inicia sesión como usuario con rol ORGANIZADOR y confirma llegada a /dashboard/organizer.
 */
export async function loginAsOrganizer(
  page: Page,
  user: Pick<TestUserData, "email" | "password">
): Promise<void> {
  await loginViaUI(page, user.email, user.password);
  await page.waitForURL(/\/dashboard\/organizer/, { timeout: 15000 });
}

/**
 * Cierra la sesión activa a través de la interfaz (Navbar) o reseteo de cookies.
 */
export async function logoutViaUI(page: Page): Promise<void> {
  const logoutButton = page.getByRole("button", { name: /cerrar sesión/i });
  if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await logoutButton.click();
    await page.waitForURL(
      (url) => url.pathname === "/" || url.pathname.startsWith("/auth"),
      {
        timeout: 10000,
      }
    );
  } else {
    await page.context().clearCookies();
    await page.goto("/");
  }
}
