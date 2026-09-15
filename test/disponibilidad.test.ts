import { describe, it, expect } from "vitest";
import {
  estanIntervalosSuperpuestos,
  contratacionBloqueaDisponibilidad,
  validarDisponibilidadMusico,
} from "@/lib/disponibilidad";

describe("Reglas de Disponibilidad Horaria", () => {
  describe("estanIntervalosSuperpuestos", () => {
    it("caso que pasa: detecta superposición real entre dos intervalos", () => {
      // 20:00 a 23:00 vs 21:00 a 00:00
      const inicioA = new Date("2026-10-10T20:00:00Z");
      const finA = new Date("2026-10-10T23:00:00Z");
      const inicioB = new Date("2026-10-10T21:00:00Z");
      const finB = new Date("2026-10-11T00:00:00Z");

      expect(estanIntervalosSuperpuestos(inicioA, finA, inicioB, finB)).toBe(true);
    });

    it("caso que falla: intervalos en horarios completamente separados no se superponen", () => {
      // 12:00 a 15:00 vs 21:00 a 23:30 (mismo día)
      const inicioA = new Date("2026-10-10T12:00:00Z");
      const finA = new Date("2026-10-10T15:00:00Z");
      const inicioB = new Date("2026-10-10T21:00:00Z");
      const finB = new Date("2026-10-10T23:30:00Z");

      expect(estanIntervalosSuperpuestos(inicioA, finA, inicioB, finB)).toBe(false);
    });

    it("caso borde: un evento comienza exactamente cuando termina el otro (adyacentes 18:00–20:00 y 20:00–22:00) -> NO se superponen", () => {
      const inicioA = new Date("2026-10-10T18:00:00Z");
      const finA = new Date("2026-10-10T20:00:00Z");
      const inicioB = new Date("2026-10-10T20:00:00Z");
      const finB = new Date("2026-10-10T22:00:00Z");

      expect(estanIntervalosSuperpuestos(inicioA, finA, inicioB, finB)).toBe(false);
    });

    it("caso borde: intervalo inválido con inicio posterior o igual a fin retorna false", () => {
      const inicioA = new Date("2026-10-10T22:00:00Z");
      const finA = new Date("2026-10-10T20:00:00Z");
      const inicioB = new Date("2026-10-10T20:00:00Z");
      const finB = new Date("2026-10-10T23:00:00Z");

      expect(estanIntervalosSuperpuestos(inicioA, finA, inicioB, finB)).toBe(false);
    });
  });

  describe("contratacionBloqueaDisponibilidad", () => {
    it("NEGOCIANDO y ACORDADO bloquean disponibilidad", () => {
      expect(contratacionBloqueaDisponibilidad("NEGOCIANDO")).toBe(true);
      expect(contratacionBloqueaDisponibilidad("ACORDADO")).toBe(true);
    });

    it("CANCELADO y COMPLETADO NO bloquean disponibilidad", () => {
      expect(contratacionBloqueaDisponibilidad("CANCELADO")).toBe(false);
      expect(contratacionBloqueaDisponibilidad("COMPLETADO")).toBe(false);
    });
  });

  describe("validarDisponibilidadMusico", () => {
    it("caso que pasa: músico sin contrataciones superpuestas está disponible", () => {
      const resultado = validarDisponibilidadMusico({
        nuevoEvento: {
          startsAt: new Date("2026-10-10T20:00:00Z"),
          endsAt: new Date("2026-10-10T23:00:00Z"),
        },
        contratacionesExistentes: [
          {
            id: "c-1",
            estado: "ACORDADO",
            evento: {
              titulo: "Evento Mediodía",
              startsAt: new Date("2026-10-10T12:00:00Z"),
              endsAt: new Date("2026-10-10T15:00:00Z"),
            },
          },
        ],
      });

      expect(resultado.ok).toBe(true);
      expect(resultado.disponible).toBe(true);
    });

    it("caso que falla: detecta conflicto cuando existe una contratación NEGOCIANDO superpuesta", () => {
      const resultado = validarDisponibilidadMusico({
        nuevoEvento: {
          startsAt: new Date("2026-10-10T20:00:00Z"),
          endsAt: new Date("2026-10-10T23:00:00Z"),
        },
        contratacionesExistentes: [
          {
            id: "c-conflictiva",
            estado: "NEGOCIANDO",
            evento: {
              titulo: "Festival Noche",
              startsAt: new Date("2026-10-10T21:00:00Z"),
              endsAt: new Date("2026-10-11T01:00:00Z"),
            },
          },
        ],
      });

      expect(resultado.ok).toBe(false);
      expect(resultado.disponible).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("CONFLICTO_HORARIO");
        expect(resultado.conflictos).toHaveLength(1);
        expect(resultado.conflictos[0].contratacionId).toBe("c-conflictiva");
        expect(resultado.conflictos[0].eventoTitulo).toBe("Festival Noche");
      }
    });

    it("caso borde: ignora contrataciones CANCELADAS aunque tengan horarios superpuestos", () => {
      const resultado = validarDisponibilidadMusico({
        nuevoEvento: {
          startsAt: new Date("2026-10-10T20:00:00Z"),
          endsAt: new Date("2026-10-10T23:00:00Z"),
        },
        contratacionesExistentes: [
          {
            id: "c-cancelada",
            estado: "CANCELADO",
            evento: {
              titulo: "Evento Cancelado",
              startsAt: new Date("2026-10-10T20:00:00Z"),
              endsAt: new Date("2026-10-10T23:00:00Z"),
            },
          },
        ],
      });

      expect(resultado.ok).toBe(true);
      expect(resultado.disponible).toBe(true);
    });

    it("caso borde: permite ignorar el ID de la contratación actual al re-evaluarla", () => {
      const resultado = validarDisponibilidadMusico({
        nuevoEvento: {
          startsAt: new Date("2026-10-10T20:00:00Z"),
          endsAt: new Date("2026-10-10T23:00:00Z"),
        },
        contratacionesExistentes: [
          {
            id: "c-propia-en-negociacion",
            estado: "NEGOCIANDO",
            evento: {
              titulo: "Mismo evento",
              startsAt: new Date("2026-10-10T20:00:00Z"),
              endsAt: new Date("2026-10-10T23:00:00Z"),
            },
          },
        ],
        contratacionActualIdIgnorar: "c-propia-en-negociacion",
      });

      expect(resultado.ok).toBe(true);
      expect(resultado.disponible).toBe(true);
    });
  });
});

