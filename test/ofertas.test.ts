import { describe, it, expect } from "vitest";
import {
  validarCreacionOferta,
  validarAceptacionOferta,
  validarRechazoOferta,
} from "@/lib/ofertas";

describe("Reglas de Negociación de Ofertas y Contraofertas", () => {
  const contratoBase = {
    id: "contrato-1",
    organizadorId: "org-1",
    musicoId: "mus-1",
    estado: "NEGOCIANDO" as const,
  };

  describe("validarCreacionOferta", () => {
    it("caso que pasa: participante crea una primera oferta en contratación NEGOCIANDO", () => {
      const resultado = validarCreacionOferta({
        contratacion: contratoBase,
        usuarioId: "org-1",
        monto: 150000,
        ofertasExistentes: [],
      });

      expect(resultado.ok).toBe(true);
      if (resultado.ok) {
        expect(resultado.esContraoferta).toBe(false);
        expect(resultado.ofertasAContraofertar).toEqual([]);
      }
    });

    it("caso que pasa (contraoferta): identifica propuesta anterior para pasar a CONTRAOFERTADA", () => {
      const resultado = validarCreacionOferta({
        contratacion: contratoBase,
        usuarioId: "mus-1",
        monto: 180000,
        ofertasExistentes: [
          { id: "of-1", remitenteId: "org-1", monto: 150000, estado: "PROPUESTA" },
        ],
      });

      expect(resultado.ok).toBe(true);
      if (resultado.ok) {
        expect(resultado.esContraoferta).toBe(true);
        expect(resultado.ofertasAContraofertar).toEqual(["of-1"]);
      }
    });

    it("caso que falla: usuario ajeno a la negociación no puede ofertar", () => {
      const resultado = validarCreacionOferta({
        contratacion: contratoBase,
        usuarioId: "tercero-ajeno",
        monto: 200000,
        ofertasExistentes: [],
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("USUARIO_NO_PARTICIPANTE");
      }
    });

    it("caso que falla: contratación cerrada (ACORDADO) no acepta nuevas ofertas", () => {
      const resultado = validarCreacionOferta({
        contratacion: { ...contratoBase, estado: "ACORDADO" },
        usuarioId: "mus-1",
        monto: 180000,
        ofertasExistentes: [],
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("CONTRATACION_NO_NEGOCIANDO");
      }
    });

    it("caso que falla: monto inválido negativo o NaN", () => {
      const resultado = validarCreacionOferta({
        contratacion: contratoBase,
        usuarioId: "org-1",
        monto: -500,
        ofertasExistentes: [],
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("MONTO_INVALIDO");
      }
    });

    it("caso borde: monto cero (presentación sin caché / ad-honorem acordada) es permitido", () => {
      const resultado = validarCreacionOferta({
        contratacion: contratoBase,
        usuarioId: "mus-1",
        monto: 0,
        ofertasExistentes: [],
      });

      expect(resultado.ok).toBe(true);
    });
  });

  describe("validarAceptacionOferta", () => {
    const ofertaPropuesta = {
      id: "of-1",
      remitenteId: "org-1",
      monto: 150000,
      estado: "PROPUESTA" as const,
    };

    it("caso que pasa: la contraparte (músico) puede aceptar una oferta en estado PROPUESTA", () => {
      const resultado = validarAceptacionOferta({
        oferta: ofertaPropuesta,
        contratacion: contratoBase,
        usuarioId: "mus-1",
      });

      expect(resultado.ok).toBe(true);
      if (resultado.ok) {
        expect(resultado.montoPactado).toBe(150000);
      }
    });

    it("caso que falla: el emisor de la oferta no puede aceptar su propia propuesta", () => {
      const resultado = validarAceptacionOferta({
        oferta: ofertaPropuesta,
        contratacion: contratoBase,
        usuarioId: "org-1", // emisor
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("EMISOR_NO_PUEDE_ACEPTAR_PROPIA_OFERTA");
      }
    });

    it("caso que falla: oferta en estado CONTRAOFERTADA o RECHAZADA no puede aceptarse", () => {
      const resultado = validarAceptacionOferta({
        oferta: { ...ofertaPropuesta, estado: "CONTRAOFERTADA" },
        contratacion: contratoBase,
        usuarioId: "mus-1",
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("OFERTA_NO_PROPUESTA");
      }
    });

    it("caso que falla: contratación ya ACORDADA no permite aceptar más ofertas", () => {
      const resultado = validarAceptacionOferta({
        oferta: ofertaPropuesta,
        contratacion: { ...contratoBase, estado: "ACORDADO" },
        usuarioId: "mus-1",
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("CONTRATACION_NO_NEGOCIANDO");
      }
    });

    it("caso borde: usuario ajeno intenta aceptar oferta", () => {
      const resultado = validarAceptacionOferta({
        oferta: ofertaPropuesta,
        contratacion: contratoBase,
        usuarioId: "intruso",
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("USUARIO_NO_PARTICIPANTE");
      }
    });
  });

  describe("validarRechazoOferta", () => {
    const ofertaPropuesta = {
      id: "of-1",
      remitenteId: "mus-1",
      monto: 200000,
      estado: "PROPUESTA" as const,
    };

    it("caso que pasa: el organizador rechaza la propuesta del músico", () => {
      const resultado = validarRechazoOferta({
        oferta: ofertaPropuesta,
        contratacion: contratoBase,
        usuarioId: "org-1",
      });

      expect(resultado.ok).toBe(true);
    });

    it("caso que falla: el músico no puede rechazar su propia propuesta", () => {
      const resultado = validarRechazoOferta({
        oferta: ofertaPropuesta,
        contratacion: contratoBase,
        usuarioId: "mus-1", // emisor
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("EMISOR_NO_PUEDE_RECHAZAR_PROPIA_OFERTA");
      }
    });

    it("caso borde: oferta ya ACEPTADA no puede rechazarse", () => {
      const resultado = validarRechazoOferta({
        oferta: { ...ofertaPropuesta, estado: "ACEPTADA" },
        contratacion: contratoBase,
        usuarioId: "org-1",
      });

      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        expect(resultado.motivo).toBe("OFERTA_NO_PROPUESTA");
      }
    });
  });
});

