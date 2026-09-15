/**
 * Reglas de negocio puras para la verificación de disponibilidad horaria de músicos.
 *
 * @see docs/spec.md § 8. Reglas de disponibilidad del músico
 * @see AGENTS.md § 3. PRINCIPIOS GENERALES
 */

import type { EstadoContratacion } from "@/lib/types";

/**
 * Convierte un valor de fecha o timestamp a milisegundos numéricos.
 */
function aTimestamp(fecha: Date | string | number): number {
  if (typeof fecha === "number") return fecha;
  if (fecha instanceof Date) return fecha.getTime();
  return new Date(fecha).getTime();
}

/**
 * Determina si dos intervalos de tiempo se superponen.
 *
 * Regla:
 * nuevoInicio < existenteFin y nuevoFin > existenteInicio
 *
 * Intervalos adyacentes (ej. 18:00–20:00 y 20:00–22:00) NO se superponen.
 */
export function estanIntervalosSuperpuestos(
  inicioA: Date | string | number,
  finA: Date | string | number,
  inicioB: Date | string | number,
  finB: Date | string | number
): boolean {
  const startA = aTimestamp(inicioA);
  const endA = aTimestamp(finA);
  const startB = aTimestamp(inicioB);
  const endB = aTimestamp(finB);

  if (Number.isNaN(startA) || Number.isNaN(endA) || Number.isNaN(startB) || Number.isNaN(endB)) {
    return false;
  }

  if (startA >= endA || startB >= endB) {
    return false;
  }

  return startA < endB && endA > startB;
}

/**
 * Determina si una contratación en un estado dado bloquea la disponibilidad horaria del músico.
 *
 * Bloquean: NEGOCIANDO, ACORDADO.
 * No bloquean: CANCELADO, COMPLETADO.
 */
export function contratacionBloqueaDisponibilidad(estado: EstadoContratacion): boolean {
  return estado === "NEGOCIANDO" || estado === "ACORDADO";
}

export type ConflictoDisponibilidad = {
  contratacionId: string;
  eventoTitulo?: string;
  startsAt: Date | string | number;
  endsAt: Date | string | number;
};

export type ResultadoDisponibilidad =
  | {
      ok: true;
      disponible: true;
    }
  | {
      ok: false;
      disponible: false;
      motivo: "CONFLICTO_HORARIO";
      conflictos: ConflictoDisponibilidad[];
    };

export interface ContratacionExistenteParaDisponibilidad {
  id: string;
  estado: EstadoContratacion;
  evento: {
    titulo?: string;
    startsAt: Date | string | number;
    endsAt: Date | string | number;
  };
}

/**
 * Valida si un músico tiene disponibilidad para participar en un nuevo evento
 * comparando contra sus contrataciones activas existentes.
 */
export function validarDisponibilidadMusico(params: {
  nuevoEvento: {
    startsAt: Date | string | number;
    endsAt: Date | string | number;
  };
  contratacionesExistentes: ContratacionExistenteParaDisponibilidad[];
  contratacionActualIdIgnorar?: string;
}): ResultadoDisponibilidad {
  const { nuevoEvento, contratacionesExistentes, contratacionActualIdIgnorar } = params;

  const conflictos: ConflictoDisponibilidad[] = [];

  for (const contratacion of contratacionesExistentes) {
    if (contratacionActualIdIgnorar && contratacion.id === contratacionActualIdIgnorar) {
      continue;
    }

    if (!contratacionBloqueaDisponibilidad(contratacion.estado)) {
      continue;
    }

    const superpuesto = estanIntervalosSuperpuestos(
      nuevoEvento.startsAt,
      nuevoEvento.endsAt,
      contratacion.evento.startsAt,
      contratacion.evento.endsAt
    );

    if (superpuesto) {
      conflictos.push({
        contratacionId: contratacion.id,
        eventoTitulo: contratacion.evento.titulo,
        startsAt: contratacion.evento.startsAt,
        endsAt: contratacion.evento.endsAt,
      });
    }
  }

  if (conflictos.length > 0) {
    return {
      ok: false,
      disponible: false,
      motivo: "CONFLICTO_HORARIO",
      conflictos,
    };
  }

  return {
    ok: true,
    disponible: true,
  };
}

