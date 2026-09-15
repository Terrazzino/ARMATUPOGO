import { describe, it, expect } from "vitest";
import {
  determinarDestinatarioValoracion,
  validarCreacionValoracion,
  calcularReputacion,
} from "@/lib/valoraciones";

describe("Reglas de Valoración y Cálculo de Reputación", () => {
  const contratacionCompletada = {
    id: "contrato-1",
    organizadorId: "org-1",
    musicoId: "mus-1",
    proyectoMusicalId: "proy-1",
    estado: "COMPLETADO" as const,
  };

  describe("determinarDestinatarioValoracion", () => {
    it("caso que pasa: el músico valora al organizador sin asociar proyecto destinatario", () => {
      const resultado = determinarDestinatarioValoracion({
        contratacion: contratacionCompletada,
        usuarioId: "mus-1",
      });

      expect(resultado.ok).toBe(true);
      if (resultado.ok) {
        expect(resultado.autorId).toBe("mus-1");
        expect(resultado.destinatarioId).toBe("org-1");
        expect(resultado.proyectoDestinatarioId).toBeNull();
        expect(resultado.rolAutor).toBe("MUSICO");
      }
    });

    it("caso que pasa: el organizador valora al proyecto musical y al músico propietario", () => {
      const resultado = determinarDestinatarioValoracion({
        contratacion: contratacionCompletada,
        usuarioId: "org-1",
      });

      expect(resultado.ok).toBe(true);
      if (resultado.ok) {
        expect(resultado.autorId).toBe("org-1");
        expect(resultado.destinatarioId).toBe("mus-1");
        expect(resultado.proyectoDestinatarioId).toBe("proy-1");
        expect(resultado.rolAutor).toBe("ORGANIZADOR");
      }
    });

    it("caso que falla: usuario ajeno a la contratación no puede valorar", () => {
      const resultado = determinarDestinatarioValoracion({
        contratacion: contratacionCompletada,
        usuarioId: "tercero-ajeno",
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("USUARIO_NO_PARTICIPANTE");
      }
    });
  });

  describe("validarCreacionValoracion", () => {
    it("caso que pasa: valoración válida con puntaje en rango 1-5 en contratación COMPLETADA", () => {
      const resultado = validarCreacionValoracion({
        contratacion: contratacionCompletada,
        usuarioId: "mus-1",
        valoracionPreviaExiste: false,
        puntaje: 5,
      });

      expect(resultado.ok).toBe(true);
      if (resultado.ok) {
        expect(resultado.puntaje).toBe(5);
        expect(resultado.destinatarioId).toBe("org-1");
      }
    });

    it("caso que falla: contratación en estado ACORDADO aún no puede valorarse", () => {
      const resultado = validarCreacionValoracion({
        contratacion: { ...contratacionCompletada, estado: "ACORDADO" },
        usuarioId: "mus-1",
        valoracionPreviaExiste: false,
        puntaje: 5,
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("CONTRATACION_NO_COMPLETADA");
      }
    });

    it("caso que falla: no se puede valorar dos veces la misma contratación", () => {
      const resultado = validarCreacionValoracion({
        contratacion: contratacionCompletada,
        usuarioId: "mus-1",
        valoracionPreviaExiste: true,
        puntaje: 4,
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("VALORACION_DUPLICADA");
      }
    });

    it("caso borde: puntaje mínimo 1 es aceptado", () => {
      const resultado = validarCreacionValoracion({
        contratacion: contratacionCompletada,
        usuarioId: "org-1",
        valoracionPreviaExiste: false,
        puntaje: 1,
      });

      expect(resultado.ok).toBe(true);
    });

    it("caso borde: puntaje 0 o 6 es rechazado por fuera de rango", () => {
      const r0 = validarCreacionValoracion({
        contratacion: contratacionCompletada,
        usuarioId: "org-1",
        valoracionPreviaExiste: false,
        puntaje: 0,
      });
      expect(r0.ok).toBe(false);
      if (!r0.ok) expect(r0.motivo).toBe("PUNTAJE_INVALIDO");

      const r6 = validarCreacionValoracion({
        contratacion: contratacionCompletada,
        usuarioId: "org-1",
        valoracionPreviaExiste: false,
        puntaje: 6,
      });
      expect(r6.ok).toBe(false);
      if (!r6.ok) expect(r6.motivo).toBe("PUNTAJE_INVALIDO");
    });

    it("caso borde: puntaje no entero (ej. 4.5) es rechazado", () => {
      const resultado = validarCreacionValoracion({
        contratacion: contratacionCompletada,
        usuarioId: "org-1",
        valoracionPreviaExiste: false,
        puntaje: 4.5,
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("PUNTAJE_INVALIDO");
      }
    });
  });

  describe("calcularReputacion", () => {
    it("calcula promedio y total correctamente con redondeo a 1 decimal", () => {
      const resultado = calcularReputacion([
        { puntaje: 5 },
        { puntaje: 4 },
        { puntaje: 4 },
      ]);

      expect(resultado.total).toBe(3);
      expect(resultado.promedio).toBe(4.3);
    });

    it("caso borde: sin valoraciones retorna total 0 y promedio 0", () => {
      const resultado = calcularReputacion([]);

      expect(resultado.total).toBe(0);
      expect(resultado.promedio).toBe(0);
    });
  });
});

