import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma";
import { createOfferForParticipant } from "../lib/offer-access";

test.describe("Clase 14 — Sistema bajo carga y condición de carrera en negociación", () => {
  let organizadorId: string;
  let musicoId: string;
  let proyectoId: string;
  let eventoId: string;
  const contratosCreados: string[] = [];

  test.beforeAll(async () => {
    // 1. Preparar usuarios de prueba directamente en PostgreSQL local real
    const timestamp = Date.now();
    const org = await prisma.usuario.create({
      data: {
        id: randomUUID(),
        email: `org.concurrency.${timestamp}@test.local`,
        nombre: "Organizador",
        apellido: "Carga",
        rol: "ORGANIZADOR",
      },
    });
    organizadorId = org.id;

    const mus = await prisma.usuario.create({
      data: {
        id: randomUUID(),
        email: `mus.concurrency.${timestamp}@test.local`,
        nombre: "Musico",
        apellido: "Carga",
        rol: "MUSICO",
      },
    });
    musicoId = mus.id;

    // 2. Preparar proyecto musical
    const proyecto = await prisma.proyectoMusical.create({
      data: {
        usuarioId: musicoId,
        nombre: `Banda Carga ${timestamp}`,
        genero: "Rock",
        cacheAproximado: 50000,
      },
    });
    proyectoId = proyecto.id;

    // 3. Preparar evento base
    const ahora = new Date();
    const startsAt = new Date(ahora.getTime() + 48 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 4 * 60 * 60 * 1000);

    const evento = await prisma.evento.create({
      data: {
        organizadorId,
        titulo: `Evento Carga ${timestamp}`,
        startsAt,
        endsAt,
        ubicacion: "Av. Corrientes 1234",
        ciudad: "CABA",
        cantidadMusicosRequerida: 2,
        cacheOfrecido: 45000,
      },
    });
    eventoId = evento.id;
  });

  test.afterAll(async () => {
    // Limpieza de datos en PostgreSQL
    try {
      if (contratosCreados.length > 0) {
        await prisma.oferta.deleteMany({
          where: { contratacionId: { in: contratosCreados } },
        });
        await prisma.contratacion.deleteMany({
          where: { id: { in: contratosCreados } },
        });
      }
      if (eventoId) {
        await prisma.evento.deleteMany({ where: { id: eventoId } });
      }
      if (proyectoId) {
        await prisma.proyectoMusical.deleteMany({ where: { id: proyectoId } });
      }
      if (organizadorId || musicoId) {
        await prisma.usuario.deleteMany({
          where: { id: { in: [organizadorId, musicoId].filter(Boolean) } },
        });
      }
    } catch {
      // Ignorar errores de limpieza
    }
  });

  test("10 contraofertas simultáneas sobre la misma contratación deben preservar a lo sumo UNA oferta en estado PROPUESTA", async () => {
    // Invariante funcional (@see docs/spec.md §5.6 y H8):
    // "Dentro de una contratación solamente puede existir una oferta vigente en estado PROPUESTA."

    let contratacionId = "";
    let ofertasPropuestasCount = 1;
    let reporteEjecucion = "";

    // Ejecutar hasta 5 intentos de ráfagas concurrentes para capturar el solapamiento de la carrera
    for (let ronda = 1; ronda <= 5; ronda++) {
      // Crear contratación válida en estado NEGOCIANDO
      // (usamos un proyecto diferente por ronda para respetar @@unique([eventoId, proyectoMusicalId]))
      const proyectoRonda = await prisma.proyectoMusical.create({
        data: {
          usuarioId: musicoId,
          nombre: `Proyecto Ronda ${ronda}_${Date.now()}`,
          genero: "Rock",
          cacheAproximado: 40000,
        },
      });

      const contratacion = await prisma.contratacion.create({
        data: {
          eventoId,
          proyectoMusicalId: proyectoRonda.id,
          organizadorId,
          musicoId,
          creadoPorId: organizadorId,
          estado: "NEGOCIANDO",
        },
      });
      contratacionId = contratacion.id;
      contratosCreados.push(contratacionId);

      // Crear propuesta inicial del organizador
      await prisma.oferta.create({
        data: {
          contratacionId,
          remitenteId: organizadorId,
          monto: 30000,
          mensaje: `Propuesta inicial ronda ${ronda}`,
          estado: "PROPUESTA",
        },
      });

      // Disparar 10 solicitudes concurrentes simultáneamente vía Promise.all
      const intentos = Array.from({ length: 10 }, (_, i) => {
        const monto = 35000 + (i + 1) * 1000;
        return createOfferForParticipant({
          contractId: contratacionId,
          userId: musicoId,
          amount: monto,
          message: `Contraoferta concurrente #${i + 1} por $${monto}`,
        });
      });

      const resultados = await Promise.allSettled(intentos);

      // Verificación directa sobre PostgreSQL
      const contratacionDb = await prisma.contratacion.findUnique({
        where: { id: contratacionId },
        include: {
          ofertas: {
            orderBy: { creadoEn: "asc" },
          },
        },
      });

      const ofertasPersistidas = contratacionDb?.ofertas || [];
      const ofertasPropuestas = ofertasPersistidas.filter((o) => o.estado === "PROPUESTA");
      ofertasPropuestasCount = ofertasPropuestas.length;

      const aceptadas = resultados.filter((r) => r.status === "fulfilled").length;
      const rechazadas = resultados.filter((r) => r.status === "rejected").length;

      reporteEjecucion = `
=======================================================
REPORTE DE EJECUCIÓN CONCURRENTE (10 OPERACIONES):
=======================================================
- Ronda: ${ronda}
- Solicitudes lanzadas: 10
- Solicitudes aceptadas (fulfilled): ${aceptadas}
- Solicitudes rechazadas (rejected): ${rechazadas}
- Estado final de la contratación: ${contratacionDb?.estado}
- Total de ofertas persistidas: ${ofertasPersistidas.length}
- Ofertas persistidas por estado: ${JSON.stringify(
        ofertasPersistidas.reduce((acc, o) => {
          acc[o.estado] = (acc[o.estado] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      )}
- Ofertas en estado PROPUESTA encontradas: ${ofertasPropuestasCount}
=======================================================`;

      // Si se capturó la condición de carrera (más de una oferta PROPUESTA), terminamos y mostramos el fallo
      if (ofertasPropuestasCount > 1) {
        break;
      }
    }

    console.log(reporteEjecucion);

    // ASSERTION QUE DEMUESTRA LA INVARIANTE:
    // Si la condición de carrera existe, esta aserción falla demostrando que PostgreSQL
    // terminó permitiendo más de una oferta en estado PROPUESTA.
    expect(
      ofertasPropuestasCount,
      `Violación de invariante: se esperaban como máximo 1 oferta en estado PROPUESTA pero se encontraron ${ofertasPropuestasCount}`
    ).toBe(1);
  });
});
