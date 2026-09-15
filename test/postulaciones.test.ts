import { describe, it, expect } from "vitest";
import {
  validarCreacionPostulacion,
  validarCancelacionPostulacion,
  validarAceptacionPostulacion,
  validarRechazoPostulacion,
  identificarPostulacionesACancelar,
} from "@/lib/postulaciones";

describe("Reglas de Postulación de Proyectos a Eventos", () => {
  const usuarioMusicoId = "musico-1";
  const proyectoValido = {
    usuarioId: usuarioMusicoId,
    estaActivo: true,
  };
  const eventoValido = {
    organizadorId: "org-1",
    estado: "PUBLICADO" as const,
    startsAt: new Date("2026-12-01T20:00:00Z"),
  };
  const ahora = new Date("2026-11-01T12:00:00Z");

  describe("validarCreacionPostulacion", () => {
    it("caso que pasa: músico postula su proyecto activo a un evento publicado futuro", () => {
      const resultado = validarCreacionPostulacion({
        rolUsuario: "MUSICO",
        proyecto: proyectoValido,
        evento: eventoValido,
        usuarioId: usuarioMusicoId,
        postulacionExistente: false,
        ahora,
      });

      expect(resultado.ok).toBe(true);
    });

    it("caso que falla: usuario con rol ORGANIZADOR no puede postular", () => {
      const resultado = validarCreacionPostulacion({
        rolUsuario: "ORGANIZADOR",
        proyecto: proyectoValido,
        evento: eventoValido,
        usuarioId: usuarioMusicoId,
        postulacionExistente: false,
        ahora,
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("ROL_NO_PERMITIDO");
      }
    });

    it("caso que falla: el proyecto no pertenece al usuario", () => {
      const resultado = validarCreacionPostulacion({
        rolUsuario: "MUSICO",
        proyecto: { ...proyectoValido, usuarioId: "otro-musico" },
        evento: eventoValido,
        usuarioId: usuarioMusicoId,
        postulacionExistente: false,
        ahora,
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("PROYECTO_NO_PERTENECE_AL_USUARIO");
      }
    });

    it("caso que falla: proyecto inactivo no puede postularse", () => {
      const resultado = validarCreacionPostulacion({
        rolUsuario: "MUSICO",
        proyecto: { ...proyectoValido, estaActivo: false },
        evento: eventoValido,
        usuarioId: usuarioMusicoId,
        postulacionExistente: false,
        ahora,
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("PROYECTO_INACTIVO");
      }
    });

    it("caso que falla: evento cancelado no acepta postulaciones", () => {
      const resultado = validarCreacionPostulacion({
        rolUsuario: "MUSICO",
        proyecto: proyectoValido,
        evento: { ...eventoValido, estado: "CANCELADO" },
        usuarioId: usuarioMusicoId,
        postulacionExistente: false,
        ahora,
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("EVENTO_NO_PUBLICADO");
      }
    });

    it("caso que falla: evento que ya comenzó no acepta postulaciones", () => {
      const resultado = validarCreacionPostulacion({
        rolUsuario: "MUSICO",
        proyecto: proyectoValido,
        evento: eventoValido,
        usuarioId: usuarioMusicoId,
        postulacionExistente: false,
        ahora: new Date("2026-12-01T21:00:00Z"), // 1 hora después del inicio
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("EVENTO_YA_COMENZO");
      }
    });

    it("caso que falla: postulación duplicada para el mismo proyecto y evento", () => {
      const resultado = validarCreacionPostulacion({
        rolUsuario: "MUSICO",
        proyecto: proyectoValido,
        evento: eventoValido,
        usuarioId: usuarioMusicoId,
        postulacionExistente: true,
        ahora,
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("POSTULACION_DUPLICADA");
      }
    });
  });

  describe("validarCancelacionPostulacion", () => {
    it("caso que pasa: músico cancela su postulación PENDIENTE", () => {
      const resultado = validarCancelacionPostulacion({
        postulacion: { musicoId: usuarioMusicoId, estado: "PENDIENTE" },
        usuarioId: usuarioMusicoId,
      });

      expect(resultado.ok).toBe(true);
    });

    it("caso que falla: usuario ajeno intenta cancelar la postulación", () => {
      const resultado = validarCancelacionPostulacion({
        postulacion: { musicoId: usuarioMusicoId, estado: "PENDIENTE" },
        usuarioId: "otro-usuario",
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("USUARIO_NO_PROPIETARIO");
      }
    });

    it("caso borde: postulación en estado ACEPTADA o RECHAZADA ya no puede cancelarse", () => {
      const resultado = validarCancelacionPostulacion({
        postulacion: { musicoId: usuarioMusicoId, estado: "ACEPTADA" },
        usuarioId: usuarioMusicoId,
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("POSTULACION_NO_PENDIENTE");
      }
    });
  });

  describe("validarAceptacionPostulacion", () => {
    it("caso que pasa: organizador del evento acepta postulación PENDIENTE", () => {
      const resultado = validarAceptacionPostulacion({
        postulacion: { estado: "PENDIENTE" },
        evento: { organizadorId: "org-1", estado: "PUBLICADO" },
        usuarioId: "org-1",
        contratacionExistente: false,
      });

      expect(resultado.ok).toBe(true);
    });

    it("caso que falla: organizador de otro evento intenta aceptar", () => {
      const resultado = validarAceptacionPostulacion({
        postulacion: { estado: "PENDIENTE" },
        evento: { organizadorId: "org-1", estado: "PUBLICADO" },
        usuarioId: "org-ajeno",
        contratacionExistente: false,
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("USUARIO_NO_ORGANIZADOR");
      }
    });

    it("caso que falla: postulación no está en estado PENDIENTE", () => {
      const resultado = validarAceptacionPostulacion({
        postulacion: { estado: "ACEPTADA" },
        evento: { organizadorId: "org-1", estado: "PUBLICADO" },
        usuarioId: "org-1",
        contratacionExistente: false,
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("POSTULACION_NO_PENDIENTE");
      }
    });
  });

  describe("validarRechazoPostulacion", () => {
    it("caso que pasa: organizador rechaza postulación PENDIENTE", () => {
      const resultado = validarRechazoPostulacion({
        postulacion: { estado: "PENDIENTE" },
        evento: { organizadorId: "org-1" },
        usuarioId: "org-1",
      });

      expect(resultado.ok).toBe(true);
    });

    it("caso que falla: postulación ya procesada no puede rechazarse", () => {
      const resultado = validarRechazoPostulacion({
        postulacion: { estado: "RECHAZADA" },
        evento: { organizadorId: "org-1" },
        usuarioId: "org-1",
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("POSTULACION_NO_PENDIENTE");
      }
    });
  });

  describe("identificarPostulacionesACancelar", () => {
    it("identifica las demás postulaciones PENDIENTES del mismo músico para el mismo evento", () => {
      const postulaciones = [
        { id: "p-1", musicoId: "mus-1", eventoId: "ev-1", estado: "PENDIENTE" as const },
        { id: "p-2", musicoId: "mus-1", eventoId: "ev-1", estado: "PENDIENTE" as const },
        { id: "p-3", musicoId: "mus-2", eventoId: "ev-1", estado: "PENDIENTE" as const }, // otro músico
        { id: "p-4", musicoId: "mus-1", eventoId: "ev-2", estado: "PENDIENTE" as const }, // otro evento
        { id: "p-5", musicoId: "mus-1", eventoId: "ev-1", estado: "RECHAZADA" as const }, // no pendiente
      ];

      const aCancelar = identificarPostulacionesACancelar({
        postulacionAceptadaId: "p-1",
        musicoId: "mus-1",
        eventoId: "ev-1",
        postulaciones,
      });

      expect(aCancelar).toEqual(["p-2"]);
    });
  });
});

