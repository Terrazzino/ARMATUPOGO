/**
 * Reglas de negocio puras para la creación de valoraciones y cálculo de reputación.
 *
 * @see docs/spec.md § 17. Reglas de Valoración y reputación & H12, H13
 * @see AGENTS.md § 3. PRINCIPIOS GENERALES
 */

import type { EstadoContratacion } from "@/lib/types";

export interface ContratacionParaValoracion {
  id: string;
  organizadorId: string;
  musicoId: string;
  proyectoMusicalId: string;
  estado: EstadoContratacion;
}

export type ResultadoDestinatarioValoracion =
  | {
      ok: true;
      autorId: string;
      destinatarioId: string;
      proyectoDestinatarioId: string | null;
      rolAutor: "MUSICO" | "ORGANIZADOR";
    }
  | {
      ok: false;
      motivo: "USUARIO_NO_PARTICIPANTE";
    };

/**
 * Determina automáticamente el destinatario de la valoración según quién sea el autor.
 * El cliente nunca decide a quién valorar.
 */
export function determinarDestinatarioValoracion(params: {
  contratacion: ContratacionParaValoracion;
  usuarioId: string;
}): ResultadoDestinatarioValoracion {
  const { contratacion, usuarioId } = params;

  const esMusico = contratacion.musicoId === usuarioId;
  const esOrganizador = contratacion.organizadorId === usuarioId;

  if (!esMusico && !esOrganizador) {
    return { ok: false, motivo: "USUARIO_NO_PARTICIPANTE" };
  }

  if (esMusico) {
    return {
      ok: true,
      autorId: usuarioId,
      destinatarioId: contratacion.organizadorId,
      proyectoDestinatarioId: null,
      rolAutor: "MUSICO",
    };
  }

  return {
    ok: true,
    autorId: usuarioId,
    destinatarioId: contratacion.musicoId,
    proyectoDestinatarioId: contratacion.proyectoMusicalId,
    rolAutor: "ORGANIZADOR",
  };
}

export type ResultadoCreacionValoracion =
  | {
      ok: true;
      autorId: string;
      destinatarioId: string;
      proyectoDestinatarioId: string | null;
      puntaje: number;
    }
  | {
      ok: false;
      motivo:
        | "CONTRATACION_NO_COMPLETADA"
        | "USUARIO_NO_PARTICIPANTE"
        | "VALORACION_DUPLICADA"
        | "PUNTAJE_INVALIDO";
    };

/**
 * Valida la creación de una valoración sobre una contratación completada.
 */
export function validarCreacionValoracion(params: {
  contratacion: ContratacionParaValoracion;
  usuarioId: string;
  valoracionPreviaExiste: boolean;
  puntaje: number;
}): ResultadoCreacionValoracion {
  const { contratacion, usuarioId, valoracionPreviaExiste, puntaje } = params;

  // 1. Estado debe ser COMPLETADO
  if (contratacion.estado !== "COMPLETADO") {
    return { ok: false, motivo: "CONTRATACION_NO_COMPLETADA" };
  }

  // 2. Destinatario y participante
  const participantes = determinarDestinatarioValoracion({
    contratacion,
    usuarioId,
  });

  if (!participantes.ok) {
    return { ok: false, motivo: "USUARIO_NO_PARTICIPANTE" };
  }

  // 3. No duplicado
  if (valoracionPreviaExiste) {
    return { ok: false, motivo: "VALORACION_DUPLICADA" };
  }

  // 4. Puntaje entero entre 1 y 5
  if (!Number.isInteger(puntaje) || puntaje < 1 || puntaje > 5) {
    return { ok: false, motivo: "PUNTAJE_INVALIDO" };
  }

  return {
    ok: true,
    autorId: participantes.autorId,
    destinatarioId: participantes.destinatarioId,
    proyectoDestinatarioId: participantes.proyectoDestinatarioId,
    puntaje,
  };
}

export interface ResumenReputacion {
  total: number;
  promedio: number;
}

/**
 * Calcula la reputación (cantidad total y puntaje promedio redondeado a 1 decimal).
 */
export function calcularReputacion(
  valoraciones: Array<{ puntaje: number }>
): ResumenReputacion {
  const total = valoraciones.length;
  if (total === 0) {
    return {
      total: 0,
      promedio: 0,
    };
  }

  const suma = valoraciones.reduce((acc, v) => acc + v.puntaje, 0);
  const promedio = Number((suma / total).toFixed(1));

  return {
    total,
    promedio,
  };
}

