import { test, expect } from "@playwright/test";
import {
  createOrResetTestUser,
  createTestProject,
  cleanupTestUsers,
  getPrisma,
  type TestUserData,
} from "./preparar";
import { loginAsMusician, loginAsOrganizer } from "./sesiones";

const USUARIO_ORGANIZADOR: TestUserData = {
  email: "organizador.flujo@armatupogo.local",
  password: "Password123!",
  nombre: "Carlos",
  apellido: "Organizador",
  rol: "ORGANIZADOR",
};

const USUARIO_MUSICO: TestUserData = {
  email: "musico.flujo@armatupogo.local",
  password: "Password123!",
  nombre: "Valeria",
  apellido: "Música",
  rol: "MUSICO",
};

test.describe.configure({ mode: "serial" });

test.describe("Flujo Principal End-to-End (Clase 13 MDW)", () => {
  let musicoUser: { id: string };
  let organizadorUser: { id: string };
  let proyectoId: string;
  let eventoId: string;
  const eventTitle = `Recital E2E Principal ${Date.now()}`;

  test.beforeAll(async () => {
    // 1. Limpieza y preparación de usuarios de prueba en Supabase Auth Local y PostgreSQL
    organizadorUser = await createOrResetTestUser(USUARIO_ORGANIZADOR);
    musicoUser = await createOrResetTestUser(USUARIO_MUSICO);

    // 2. Crear proyecto musical activo para la música
    const proyecto = await createTestProject({
      usuarioId: musicoUser.id,
      nombre: "Banda E2E Principal",
      genero: "Rock Alternativo",
      cacheAproximado: 60000,
      descripcion: "Banda principal para pruebas de integración E2E",
    });
    proyectoId = proyecto.id;
  });

  test.afterAll(async () => {
    await cleanupTestUsers([
      USUARIO_ORGANIZADOR.email,
      USUARIO_MUSICO.email,
    ]);
  });

  test("1. Organizador publica un nuevo evento desde la interfaz", async ({
    page,
  }) => {
    await loginAsOrganizer(page, USUARIO_ORGANIZADOR);

    // Abrir modal de publicación de eventos
    const createButton = page
      .getByRole("button", {
        name: /publicar nuevo evento/i,
      })
      .first();
    await expect(createButton).toBeVisible();
    await createButton.click();

    // Completar el formulario modal accesible
    await page.locator("#event-title").fill(eventTitle);

    const tomorrow = new Date(Date.now() + 86400000);
    const dayAfter = new Date(Date.now() + 86400000 + 7200000);
    await page.locator("#event-start").fill(tomorrow.toISOString().slice(0, 16));
    await page.locator("#event-end").fill(dayAfter.toISOString().slice(0, 16));

    await page.locator("#event-capacity").fill("2");
    await page.locator("#event-venue").fill("Teatro E2E Rock");
    await page.locator("#event-location").fill("Gorriti 5520");
    await page.locator("#event-city").fill("CABA");
    await page.locator("#event-ticket-price").fill("4500");
    await page.locator("#event-fee").fill("50000");
    await page
      .locator("#event-description")
      .fill("Evento principal de validación end-to-end automatizada");

    // Enviar el formulario
    const submitButton = page.getByRole("button", {
      name: "Publicar Evento",
      exact: true,
    });
    await submitButton.click();

    // Confirmar que el evento aparece en el panel del organizador
    await expect(page.getByText(eventTitle)).toBeVisible({ timeout: 15000 });

    // Recuperar el ID asignado al evento desde Prisma
    const prisma = getPrisma();
    const eventoCreado = await prisma.evento.findFirst({
      where: { titulo: eventTitle, organizadorId: organizadorUser.id },
      select: { id: true },
    });
    expect(eventoCreado).not.toBeNull();
    eventoId = eventoCreado!.id;
  });

  test("2. Músico visualiza el evento publicado y se postula", async ({
    page,
  }) => {
    await loginAsMusician(page, USUARIO_MUSICO);

    // Navegar directamente a la página pública del recital recién creado
    await page.goto(`/events/${eventoId}`);

    // Verificar datos visibles del evento
    await expect(
      page.getByRole("heading", { level: 1, name: eventTitle })
    ).toBeVisible();
    await expect(page.getByText("Teatro E2E Rock")).toBeVisible();
    await expect(page.getByText("Gorriti 5520")).toBeVisible();

    // Iniciar postulación de la banda
    const applyButton = page.getByRole("button", {
      name: /postular mi banda/i,
    });
    await expect(applyButton).toBeVisible();
    await applyButton.click();

    // Completar modal accesible de postulación
    const cacheInput = page.getByLabel(/caché pretendido/i);
    await cacheInput.fill("50000");

    const messageInput = page.getByLabel(/mensaje al organizador/i);
    await messageInput.fill("Nos gustaría participar con nuestra banda");

    const confirmButton = page.getByRole("button", {
      name: /confirmar postulación/i,
    });
    await confirmButton.click();

    // Confirmar feedback de éxito
    await expect(
      page.getByText(/postulación enviada correctamente/i)
    ).toBeVisible({ timeout: 10000 });

    // Verificar en la base de datos que la postulación quedó registrada en PENDIENTE
    const prisma = getPrisma();
    const postulacion = await prisma.postulacion.findFirst({
      where: { eventoId, proyectoMusicalId: proyectoId },
    });
    expect(postulacion).not.toBeNull();
    expect(postulacion!.estado).toBe("PENDIENTE");
  });

  test("3. Organizador revisa y acepta la postulación iniciando la negociación", async ({
    page,
  }) => {
    await loginAsOrganizer(page, USUARIO_ORGANIZADOR);

    // En el dashboard de organizador, verificar que la postulación figura en "Por revisar"
    await expect(page.getByText("Banda E2E Principal")).toBeVisible({
      timeout: 15000,
    });

    // Expandir detalle de revisión
    const reviewButton = page.getByRole("button", { name: "Revisar" });
    await reviewButton.click();

    // Clic en aceptar e iniciar negociación
    const acceptStartButton = page.getByRole("button", {
      name: /aceptar e iniciar negociación/i,
    });
    await expect(acceptStartButton).toBeVisible();
    await acceptStartButton.click();

    // Confirmar en el diálogo de seguridad
    const confirmButton = page.getByRole("button", {
      name: "Confirmar",
      exact: true,
    });
    await confirmButton.click();

    // Verificar que la pestaña activa cambia a "En negociación"
    const negotiatingTab = page.getByRole("tab", {
      name: /en negociación/i,
    });
    await expect(negotiatingTab).toHaveAttribute("aria-selected", "true", {
      timeout: 10000,
    });

    // Verificar en Prisma que existe la contratación en NEGOCIANDO
    const prisma = getPrisma();
    const contratacion = await prisma.contratacion.findFirst({
      where: { eventoId, proyectoMusicalId: proyectoId },
    });
    expect(contratacion).not.toBeNull();
    expect(contratacion!.estado).toBe("NEGOCIANDO");
  });

  test("4. Negociación económica y acuerdo definitivo", async ({
    page,
  }) => {
    // 1. Organizador inicia la negociación enviando una propuesta económica
    await loginAsOrganizer(page, USUARIO_ORGANIZADOR);

    const negotiatingTab = page.getByRole("tab", {
      name: /en negociación/i,
    });
    await negotiatingTab.click();

    const viewNegotiationButton = page.getByRole("button", {
      name: "Ver negociación",
    });
    await expect(viewNegotiationButton).toBeVisible();
    await viewNegotiationButton.click();

    // Clic en "Iniciar Negociación" para abrir el formulario de oferta
    const startOfferButton = page.getByRole("button", {
      name: "Iniciar Negociación",
    });
    await expect(startOfferButton).toBeVisible();
    await startOfferButton.click();

    // Completar el monto propuesto y enviar
    const amountInput = page.getByLabel(/nuevo monto propuesto/i);
    await amountInput.fill("50000");

    const submitOfferButton = page.getByRole("button", {
      name: /enviar propuesta/i,
    });
    await submitOfferButton.click();

    await expect(page.getByText(/contraoferta enviada/i)).toBeVisible({
      timeout: 10000,
    });

    // 2. Músico inicia sesión, revisa la oferta y la acepta
    await loginAsMusician(page, USUARIO_MUSICO);

    const pendingTab = page.getByRole("tab", {
      name: /pendientes/i,
    });
    await pendingTab.click();

    const musicianViewNegotiationButton = page.getByRole("button", {
      name: "Ver negociación",
    });
    await expect(musicianViewNegotiationButton).toBeVisible();
    await musicianViewNegotiationButton.click();

    // Confirmar que ve la propuesta económica recibida de $50.000
    await expect(page.getByText("$50.000")).toBeVisible();

    // Clic en aceptar oferta
    const acceptOfferButton = page.getByRole("button", {
      name: /aceptar oferta y cerrar acuerdo/i,
    });
    await expect(acceptOfferButton).toBeVisible();
    await acceptOfferButton.click();

    // Confirmar en la pestaña Confirmadas que el acuerdo quedó cerrado
    const confirmedTab = page.getByRole("tab", {
      name: /confirmadas/i,
    });
    await expect(confirmedTab).toContainText("(1)", { timeout: 10000 });
    await confirmedTab.click();

    await expect(page.getByText("$50.000")).toBeVisible();

    // Verificar en Prisma que el estado es ACORDADO y montoPactado es 50000
    const prisma = getPrisma();
    const contratacionAcordada = await prisma.contratacion.findFirst({
      where: { eventoId, proyectoMusicalId: proyectoId },
    });
    expect(contratacionAcordada).not.toBeNull();
    expect(contratacionAcordada!.estado).toBe("ACORDADO");
    expect(Number(contratacionAcordada!.montoPactado)).toBe(50000);
  });

  test("5. Se finaliza la fecha y se marca la participación como completada", async ({
    page,
  }) => {
    // Simular el paso del tiempo actualizando las fechas del evento a fechas pasadas en la DB local
    const prisma = getPrisma();
    await prisma.evento.update({
      where: { id: eventoId },
      data: {
        startsAt: new Date(Date.now() - 7200000), // Hace 2 horas
        endsAt: new Date(Date.now() - 3600000), // Hace 1 hora
      },
    });

    // Iniciar sesión y acceder al panel del organizador
    await loginAsOrganizer(page, USUARIO_ORGANIZADOR);

    // Ir a la pestaña "Finalizadas" (donde se agrupan las fechas concluidas para cerrarlas)
    const finishedTab = page.getByRole("tab", {
      name: /finalizadas/i,
    });
    await finishedTab.click();

    // Como el evento ya finalizó, debe mostrarse la acción "Marcar completada"
    const completeButton = page.getByRole("button", {
      name: "Marcar completada",
    });
    await expect(completeButton).toBeVisible({ timeout: 10000 });
    await completeButton.click();

    // Confirmar en el panel de ciclo de vida
    const confirmCompleteButton = page.getByRole("button", {
      name: "Confirmar finalización",
    });
    await expect(confirmCompleteButton).toBeVisible();
    await confirmCompleteButton.click();

    // Esperar a que la acción termine: el panel se cierra y aparece el botón para calificar
    await expect(confirmCompleteButton).not.toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("button", { name: /calificar músico/i })
    ).toBeVisible({ timeout: 10000 });

    // Verificar en Prisma que el estado es COMPLETADO
    const contratacionCompletada = await prisma.contratacion.findFirst({
      where: { eventoId, proyectoMusicalId: proyectoId },
    });
    expect(contratacionCompletada!.estado).toBe("COMPLETADO");
  });

  test("6. El organizador califica al músico y se registra la reputación", async ({
    page,
  }) => {
    await loginAsOrganizer(page, USUARIO_ORGANIZADOR);

    // Ir a pestaña "Finalizadas"
    const finishedTab = page.getByRole("tab", {
      name: /finalizadas/i,
    });
    await finishedTab.click();

    // Abrir modal de calificación del músico
    const rateButton = page.getByRole("button", {
      name: /calificar músico/i,
    });
    await expect(rateButton).toBeVisible();
    await rateButton.click();

    // Seleccionar puntuación máxima (5 manos de rock)
    const fiveStarsButton = page.getByRole("button", {
      name: "Calificar con 5 de 5",
    });
    await expect(fiveStarsButton).toBeVisible();
    await fiveStarsButton.click();

    // Agregar comentario
    await page
      .locator("#rating-comment")
      .fill("Excelente banda, muy profesionales y puntuales.");

    // Enviar calificación
    const submitRatingButton = page.getByRole("button", {
      name: "Enviar Calificación",
    });
    await submitRatingButton.click();

    // Confirmar que la acción concluyó y el estado se actualizó a "Ya calificado"
    await expect(page.getByText(/ya calificado/i)).toBeVisible({
      timeout: 10000,
    });

    // Verificar en Prisma que la valoración fue persistida correctamente
    const prisma = getPrisma();
    const valoracion = await prisma.valoracion.findFirst({
      where: {
        contratacion: { eventoId, proyectoMusicalId: proyectoId },
        autorId: organizadorUser.id,
      },
    });

    expect(valoracion).not.toBeNull();
    expect(valoracion!.puntaje).toBe(5);
    expect(valoracion!.comentario).toBe(
      "Excelente banda, muy profesionales y puntuales."
    );
  });
});
