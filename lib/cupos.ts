/**
 * Reglas de negocio puras para el cálculo y validación de cupos en eventos.
 *
 * @see docs/spec.md § 9. Reglas de cupos & § 14. Modificación de eventos
 * @see AGENTS.md § 3. PRINCIPIOS GENERALES
 */

import type { EstadoContratacion } from "@/lib/types";

/**
 * Determina si una contratación ocupa un cupo del evento.
 *
 * Ocupan cupo: ACORDADO, COMPLETADO.
 * No ocupan cupo: NEGOCIANDO, CANCELADO.
 */
export function contratacionOcupaCupo(estado: EstadoContratacion): boolean {
  return estado === "ACORDADO" || estado === "COMPLETADO";
}

export interface CalculoCupos {
  cuposTotales: number;
  cuposOcupados: number;
  cuposDisponibles: number;
  hayCupoDisponible: boolean;
}

/**
 * Calcula los cupos ocupados, totales y disponibles para un evento.
 */
export function calcularCupos(params: {
  cantidadRequerida: number;
  contrataciones: Array<{ estado: EstadoContratacion }>;
}): CalculoCupos {
  const { cantidadRequerida, contrataciones } = params;

  const cuposTotales = Math.max(0, cantidadRequerida);
  const cuposOcupados = contrataciones.filter((c) => contratacionOcupaCupo(c.estado)).length;
  const cuposDisponibles = Math.max(0, cuposTotales - cuposOcupados);
  const hayCupoDisponible = cuposOcupados < cuposTotales;

  return {
    cuposTotales,
    cuposOcupados,
    cuposDisponibles,
    hayCupoDisponible,
  };
}

export type ResultadoDisponibilidadCupo =
  | {
      ok: true;
      cuposTotales: number;
      cuposOcupados: number;
      cuposDisponibles: number;
    }
  | {
      ok: false;
      motivo: "SIN_CUPO";
      cuposTotales: number;
      cuposOcupados: number;
      cuposDisponibles: number;
    };

/**
 * Valida si un evento dispone de cupo libre para aceptar una nueva contratación/oferta definitiva.
 */
export function validarDisponibilidadCupo(params: {
  cantidadRequerida: number;
  contrataciones: Array<{ estado: EstadoContratacion }>;
}): ResultadoDisponibilidadCupo {
  const calculo = calcularCupos(params);

  if (!calculo.hayCupoDisponible) {
    return {
      ok: false,
      motivo: "SIN_CUPO",
      cuposTotales: calculo.cuposTotales,
      cuposOcupados: calculo.cuposOcupados,
      cuposDisponibles: calculo.cuposDisponibles,
    };
  }

  return {
    ok: true,
    cuposTotales: calculo.cuposTotales,
    cuposOcupados: calculo.cuposOcupados,
    cuposDisponibles: calculo.cuposDisponibles,
  };
}

export type ResultadoReduccionCupos =
  | {
      ok: true;
      cuposOcupados: number;
      nuevaCantidadRequerida: number;
    }
  | {
      ok: false;
      motivo: "CANTIDAD_MENOR_A_CUPOS_OCUPADOS";
      cuposOcupados: number;
      nuevaCantidadRequerida: number;
    };

/**
 * Valida que al modificar un evento, la cantidad requerida no se reduzca
 * por debajo de los cupos ya ocupados (ACORDADO / COMPLETADO).
 */
export function validarReduccionCupos(params: {
  nuevaCantidadRequerida: number;
  contrataciones: Array<{ estado: EstadoContratacion }>;
}): ResultadoReduccionCupos {
  const { nuevaCantidadRequerida, contrataciones } = params;
  const cuposOcupados = contrataciones.filter((c) => contratacionOcupaCupo(c.estado)).length;

  if (nuevaCantidadRequerida < cuposOcupados) {
    return {
      ok: false,
      motivo: "CANTIDAD_MENOR_A_CUPOS_OCUPADOS",
      cuposOcupados,
      nuevaCantidadRequerida,
    };
  }

  return {
    ok: true,
    cuposOcupados,
    nuevaCantidadRequerida,
  };
}

