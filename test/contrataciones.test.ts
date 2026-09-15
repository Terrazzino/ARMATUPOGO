import { describe, it, expect } from "vitest";
import {
  validarCancelacionContratacion,
  validarFinalizacionContratacion,
  validarModificacionFechasEvento,
} from "@/lib/contrataciones";

describe("Reglas del Ciclo de Vida de Contrataciones", () => {
  const contratacionBase = {
    id: "contrato-1",
    organizadorId: "org-1",
    musicoId: "mus-1",
    estado: "NEGOCIANDO" as const,
  };

  describe("validarCancelacionContratacion", () => {
    it("caso que pasa: participante cancela contratación en estado NEGOCIANDO", () => {
      const resultado = validarCancelacionContratacion({
        contratacion: contratacionBase,
        evento: { startsAt: new Date("2026-11-20T20:00:00Z") },
        usuarioId: "mus-1",
        ahora: new Date("2026-11-10T12:00:00Z"),
      });

      expect(resultado.ok).toBe(true);
      if (resultado.ok) {
        expect(resultado.estadoAnterior).toBe("NEGOCIANDO");
      }
    });

    it("caso que pasa: participante cancela contratación ACORDADO antes del inicio del evento", () => {
      const resultado = validarCancelacionContratacion({
        contratacion: { ...contratacionBase, estado: "ACORDADO" },
        evento: { startsAt: new Date("2026-11-20T20:00:00Z") },
        usuarioId: "org-1",
        ahora: new Date("2026-11-19T10:00:00Z"), // antes del inicio
      });

      expect(resultado.ok).toBe(true);
    });

    it("caso que falla: contratación ACORDADO NO puede cancelarse si el evento ya comenzó", () => {
      const resultado = validarCancelacionContratacion({
        contratacion: { ...contratacionBase, estado: "ACORDADO" },
        evento: { startsAt: new Date("2026-11-20T20:00:00Z") },
        usuarioId: "mus-1",
        ahora: new Date("2026-11-20T21:00:00Z"), // 1h después de iniciar
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("EVENTO_YA_COMENZO_NO_SE_PUEDE_CANCELAR_ACUERDO");
      }
    });

    it("caso borde: ahora === startsAt -> el evento ya comenzó exactamente en ese instante, se rechaza cancelación de ACORDADO", () => {
      const resultado = validarCancelacionContratacion({
        contratacion: { ...contratacionBase, estado: "ACORDADO" },
        evento: { startsAt: new Date("2026-11-20T20:00:00Z") },
        usuarioId: "org-1",
        ahora: new Date("2026-11-20T20:00:00Z"),
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("EVENTO_YA_COMENZO_NO_SE_PUEDE_CANCELAR_ACUERDO");
      }
    });

    it("caso que falla: contratación ya CANCELADA no puede volver a cancelarse", () => {
      const resultado = validarCancelacionContratacion({
        contratacion: { ...contratacionBase, estado: "CANCELADO" },
        evento: { startsAt: new Date("2026-11-20T20:00:00Z") },
        usuarioId: "mus-1",
        ahora: new Date("2026-11-10T12:00:00Z"),
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("CONTRATACION_YA_CANCELADA");
      }
    });

    it("caso que falla: contratación COMPLETADA no puede cancelarse", () => {
      const resultado = validarCancelacionContratacion({
        contratacion: { ...contratacionBase, estado: "COMPLETADO" },
        evento: { startsAt: new Date("2026-11-20T20:00:00Z") },
        usuarioId: "mus-1",
        ahora: new Date("2026-11-21T12:00:00Z"),
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("CONTRATACION_YA_COMPLETADA");
      }
    });

    it("caso borde: usuario ajeno intenta cancelar", () => {
      const resultado = validarCancelacionContratacion({
        contratacion: contratacionBase,
        evento: { startsAt: new Date("2026-11-20T20:00:00Z") },
        usuarioId: "intruso",
        ahora: new Date("2026-11-10T12:00:00Z"),
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("USUARIO_NO_PARTICIPANTE");
      }
    });
  });

  describe("validarFinalizacionContratacion", () => {
    it("caso que pasa: participante completa contratación ACORDADA después de endsAt", () => {
      const resultado = validarFinalizacionContratacion({
        contratacion: { ...contratacionBase, estado: "ACORDADO" },
        evento: { endsAt: new Date("2026-11-20T23:00:00Z") },
        usuarioId: "mus-1",
        ahora: new Date("2026-11-21T02:00:00Z"),
      });

      expect(resultado.ok).toBe(true);
    });

    it("caso borde: evento.endsAt === ahora -> puede completarse exactamente en el instante de finalización", () => {
      const fin = new Date("2026-11-20T23:00:00Z");
      const resultado = validarFinalizacionContratacion({
        contratacion: { ...contratacionBase, estado: "ACORDADO" },
        evento: { endsAt: fin },
        usuarioId: "org-1",
        ahora: fin,
      });

      expect(resultado.ok).toBe(true);
    });

    it("caso que falla: evento todavía no finalizó (ahora < endsAt)", () => {
      const resultado = validarFinalizacionContratacion({
        contratacion: { ...contratacionBase, estado: "ACORDADO" },
        evento: { endsAt: new Date("2026-11-20T23:00:00Z") },
        usuarioId: "org-1",
        ahora: new Date("2026-11-20T22:30:00Z"),
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("EVENTO_NO_FINALIZO");
      }
    });

    it("caso que falla: contratación en estado NEGOCIANDO no puede completarse sin acuerdo previo", () => {
      const resultado = validarFinalizacionContratacion({
        contratacion: { ...contratacionBase, estado: "NEGOCIANDO" },
        evento: { endsAt: new Date("2026-11-20T23:00:00Z") },
        usuarioId: "org-1",
        ahora: new Date("2026-11-21T02:00:00Z"),
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("ESTADO_INVALIDO_PARA_COMPLETAR");
      }
    });
  });

  describe("validarModificacionFechasEvento", () => {
    it("caso que pasa: evento sin contrataciones activas permite modificar fechas", () => {
      const resultado = validarModificacionFechasEvento({
        contrataciones: [{ estado: "CANCELADO" }],
      });

      expect(resultado.ok).toBe(true);
    });

    it("caso que falla: contrataciones NEGOCIANDO o ACORDADO bloquean modificación de fechas", () => {
      const resultado = validarModificacionFechasEvento({
        contrataciones: [{ estado: "NEGOCIANDO" }, { estado: "CANCELADO" }],
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("CONTRATACIONES_ACTIVAS_IMPIDEN_MODIFICAR_FECHAS");
        expect(resultado.cantidadContratacionesActivas).toBe(1);
      }
    });
  });
});

