/**
 * Reglas de negocio puras para la negociación de ofertas y contraofertas.
 *
 * @see docs/spec.md § 12. Reglas de Oferta & H8, H9
 * @see AGENTS.md § 3. PRINCIPIOS GENERALES
 */

import type { EstadoContratacion, EstadoOferta } from "@/lib/types";

export type ResultadoCreacionOferta =
  | {
      ok: true;
      esContraoferta: boolean;
      ofertasAContraofertar: string[];
    }
  | {
      ok: false;
      motivo:
        | "USUARIO_NO_PARTICIPANTE"
        | "CONTRATACION_NO_NEGOCIANDO"
        | "MONTO_INVALIDO";
    };

export interface OfertaExistente {
  id: string;
  remitenteId: string;
  monto: number;
  estado: EstadoOferta;
}

export interface ContratacionParaOferta {
  id: string;
  organizadorId: string;
  musicoId: string;
  estado: EstadoContratacion;
}

/**
 * Valida la creación de una nueva oferta o contraoferta dentro de una contratación.
 */
export function validarCreacionOferta(params: {
  contratacion: ContratacionParaOferta;
  usuarioId: string;
  monto: number;
  ofertasExistentes: OfertaExistente[];
}): ResultadoCreacionOferta {
  const { contratacion, usuarioId, monto, ofertasExistentes } = params;

  // 1. Participante válido
  const esParticipante =
    contratacion.organizadorId === usuarioId || contratacion.musicoId === usuarioId;
  if (!esParticipante) {
    return { ok: false, motivo: "USUARIO_NO_PARTICIPANTE" };
  }

  // 2. Contratación en estado NEGOCIANDO
  if (contratacion.estado !== "NEGOCIANDO") {
    return { ok: false, motivo: "CONTRATACION_NO_NEGOCIANDO" };
  }

  // 3. Monto válido
  if (typeof monto !== "number" || Number.isNaN(monto) || monto < 0) {
    return { ok: false, motivo: "MONTO_INVALIDO" };
  }

  // Identificar propuestas anteriores que pasarán a CONTRAOFERTADA
  const propuestasVigentes = ofertasExistentes
    .filter((o) => o.estado === "PROPUESTA")
    .map((o) => o.id);

  return {
    ok: true,
    esContraoferta: propuestasVigentes.length > 0,
    ofertasAContraofertar: propuestasVigentes,
  };
}

export type ResultadoAceptacionOferta =
  | {
      ok: true;
      montoPactado: number;
      ofertasAContraofertar: string[];
    }
  | {
      ok: false;
      motivo:
        | "USUARIO_NO_PARTICIPANTE"
        | "EMISOR_NO_PUEDE_ACEPTAR_PROPIA_OFERTA"
        | "OFERTA_NO_PROPUESTA"
        | "CONTRATACION_NO_NEGOCIANDO";
    };

/**
 * Valida que una oferta vigente pueda ser aceptada por la contraparte.
 */
export function validarAceptacionOferta(params: {
  oferta: OfertaExistente;
  contratacion: ContratacionParaOferta;
  usuarioId: string;
  todasLasOfertas?: OfertaExistente[];
}): ResultadoAceptacionOferta {
  const { oferta, contratacion, usuarioId, todasLasOfertas = [] } = params;

  // 1. El usuario debe ser participante
  const esParticipante =
    contratacion.organizadorId === usuarioId || contratacion.musicoId === usuarioId;
  if (!esParticipante) {
    return { ok: false, motivo: "USUARIO_NO_PARTICIPANTE" };
  }

  // 2. El emisor no puede aceptar su propia oferta (solo la contraparte)
  if (oferta.remitenteId === usuarioId) {
    return { ok: false, motivo: "EMISOR_NO_PUEDE_ACEPTAR_PROPIA_OFERTA" };
  }

  // 3. La oferta debe encontrarse en estado PROPUESTA
  if (oferta.estado !== "PROPUESTA") {
    return { ok: false, motivo: "OFERTA_NO_PROPUESTA" };
  }

  // 4. La contratación debe encontrarse en estado NEGOCIANDO
  if (contratacion.estado !== "NEGOCIANDO") {
    return { ok: false, motivo: "CONTRATACION_NO_NEGOCIANDO" };
  }

  const otrasPropuestas = todasLasOfertas
    .filter((o) => o.id !== oferta.id && o.estado === "PROPUESTA")
    .map((o) => o.id);

  return {
    ok: true,
    montoPactado: oferta.monto,
    ofertasAContraofertar: otrasPropuestas,
  };
}

export type ResultadoRechazoOferta =
  | {
      ok: true;
    }
  | {
      ok: false;
      motivo:
        | "USUARIO_NO_PARTICIPANTE"
        | "EMISOR_NO_PUEDE_RECHAZAR_PROPIA_OFERTA"
        | "OFERTA_NO_PROPUESTA"
        | "CONTRATACION_NO_NEGOCIANDO";
    };

/**
 * Valida que una oferta vigente pueda ser rechazada por la contraparte.
 */
export function validarRechazoOferta(params: {
  oferta: OfertaExistente;
  contratacion: ContratacionParaOferta;
  usuarioId: string;
}): ResultadoRechazoOferta {
  const { oferta, contratacion, usuarioId } = params;

  // 1. El usuario debe ser participante
  const esParticipante =
    contratacion.organizadorId === usuarioId || contratacion.musicoId === usuarioId;
  if (!esParticipante) {
    return { ok: false, motivo: "USUARIO_NO_PARTICIPANTE" };
  }

  // 2. El emisor no puede rechazar su propia oferta
  if (oferta.remitenteId === usuarioId) {
    return { ok: false, motivo: "EMISOR_NO_PUEDE_RECHAZAR_PROPIA_OFERTA" };
  }

  // 3. La oferta debe encontrarse en estado PROPUESTA
  if (oferta.estado !== "PROPUESTA") {
    return { ok: false, motivo: "OFERTA_NO_PROPUESTA" };
  }

  // 4. La contratación debe encontrarse en estado NEGOCIANDO
  if (contratacion.estado !== "NEGOCIANDO") {
    return { ok: false, motivo: "CONTRATACION_NO_NEGOCIANDO" };
  }

  return {
    ok: true,
  };
}

