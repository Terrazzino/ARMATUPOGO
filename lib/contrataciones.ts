/**
 * Reglas de negocio puras para la gestión del ciclo de vida de las contrataciones.
 *
 * @see docs/spec.md § 11, § 14, § 15, § 16
 * @see AGENTS.md § 3. PRINCIPIOS GENERALES
 */

import type { EstadoContratacion } from "@/lib/types";

function aTimestamp(fecha: Date | string | number): number {
  if (typeof fecha === "number") return fecha;
  if (fecha instanceof Date) return fecha.getTime();
  return new Date(fecha).getTime();
}

export interface ContratacionParaCicloDeVida {
  id: string;
  organizadorId: string;
  musicoId: string;
  estado: EstadoContratacion;
}

export type ResultadoCancelacionContratacion =
  | {
      ok: true;
      estadoAnterior: EstadoContratacion;
    }
  | {
      ok: false;
      motivo:
        | "USUARIO_NO_PARTICIPANTE"
        | "CONTRATACION_YA_CANCELADA"
        | "CONTRATACION_YA_COMPLETADA"
        | "EVENTO_YA_COMENZO_NO_SE_PUEDE_CANCELAR_ACUERDO";
    };

/**
 * Valida si una contratación puede ser cancelada por un participante.
 *
 * Reglas:
 * - El usuario debe ser participante (organizador o músico).
 * - NEGOCIANDO -> CANCELADO: Permitido en cualquier momento.
 * - ACORDADO -> CANCELADO: Permitido ÚNICAMENTE si ahora < evento.startsAt.
 * - CANCELADO / COMPLETADO -> No permitido.
 */
export function validarCancelacionContratacion(params: {
  contratacion: ContratacionParaCicloDeVida;
  evento: {
    startsAt: Date | string | number;
  };
  usuarioId: string;
  ahora: Date | string | number;
}): ResultadoCancelacionContratacion {
  const { contratacion, evento, usuarioId, ahora } = params;

  // 1. Participante
  const esParticipante =
    contratacion.organizadorId === usuarioId || contratacion.musicoId === usuarioId;
  if (!esParticipante) {
    return { ok: false, motivo: "USUARIO_NO_PARTICIPANTE" };
  }

  // 2. Estados terminales
  if (contratacion.estado === "CANCELADO") {
    return { ok: false, motivo: "CONTRATACION_YA_CANCELADA" };
  }

  if (contratacion.estado === "COMPLETADO") {
    return { ok: false, motivo: "CONTRATACION_YA_COMPLETADA" };
  }

  // 3. Si está ACORDADO, verificar que el evento no haya comenzado
  if (contratacion.estado === "ACORDADO") {
    const tsAhora = aTimestamp(ahora);
    const tsInicioEvento = aTimestamp(evento.startsAt);

    if (tsAhora >= tsInicioEvento) {
      return {
        ok: false,
        motivo: "EVENTO_YA_COMENZO_NO_SE_PUEDE_CANCELAR_ACUERDO",
      };
    }
  }

  return {
    ok: true,
    estadoAnterior: contratacion.estado,
  };
}

export type ResultadoFinalizacionContratacion =
  | {
      ok: true;
    }
  | {
      ok: false;
      motivo:
        | "USUARIO_NO_PARTICIPANTE"
        | "ESTADO_INVALIDO_PARA_COMPLETAR"
        | "EVENTO_NO_FINALIZO";
    };

/**
 * Valida que una contratación acordada pueda marcarse como COMPLETADA tras el evento.
 *
 * Reglas:
 * - El usuario debe ser participante.
 * - El estado debe ser ACORDADO.
 * - Debe haber finalizado el evento: evento.endsAt <= ahora.
 */
export function validarFinalizacionContratacion(params: {
  contratacion: ContratacionParaCicloDeVida;
  evento: {
    endsAt: Date | string | number;
  };
  usuarioId: string;
  ahora: Date | string | number;
}): ResultadoFinalizacionContratacion {
  const { contratacion, evento, usuarioId, ahora } = params;

  // 1. Participante
  const esParticipante =
    contratacion.organizadorId === usuarioId || contratacion.musicoId === usuarioId;
  if (!esParticipante) {
    return { ok: false, motivo: "USUARIO_NO_PARTICIPANTE" };
  }

  // 2. Estado debe ser ACORDADO
  if (contratacion.estado !== "ACORDADO") {
    return { ok: false, motivo: "ESTADO_INVALIDO_PARA_COMPLETAR" };
  }

  // 3. El evento debe haber finalizado: evento.endsAt <= ahora
  const tsAhora = aTimestamp(ahora);
  const tsFinEvento = aTimestamp(evento.endsAt);

  if (tsFinEvento > tsAhora) {
    return { ok: false, motivo: "EVENTO_NO_FINALIZO" };
  }

  return {
    ok: true,
  };
}

export type ResultadoModificacionFechasEvento =
  | {
      ok: true;
    }
  | {
      ok: false;
      motivo: "CONTRATACIONES_ACTIVAS_IMPIDEN_MODIFICAR_FECHAS";
      cantidadContratacionesActivas: number;
    };

/**
 * Valida si se pueden modificar las fechas/horarios de un evento.
 * No se permite si existen contrataciones en estado NEGOCIANDO o ACORDADO.
 */
export function validarModificacionFechasEvento(params: {
  contrataciones: Array<{ estado: EstadoContratacion }>;
}): ResultadoModificacionFechasEvento {
  const activas = params.contrataciones.filter(
    (c) => c.estado === "NEGOCIANDO" || c.estado === "ACORDADO"
  );

  if (activas.length > 0) {
    return {
      ok: false,
      motivo: "CONTRATACIONES_ACTIVAS_IMPIDEN_MODIFICAR_FECHAS",
      cantidadContratacionesActivas: activas.length,
    };
  }

  return {
    ok: true,
  };
}

