/**
 * Reglas de negocio puras para la postulación de proyectos a eventos.
 *
 * @see docs/spec.md § 10. Reglas de Postulación & H5, H6
 * @see AGENTS.md § 3. PRINCIPIOS GENERALES
 */

import type { EstadoEvento, EstadoPostulacion, RolUsuario } from "@/lib/types";

function aTimestamp(fecha: Date | string | number): number {
  if (typeof fecha === "number") return fecha;
  if (fecha instanceof Date) return fecha.getTime();
  return new Date(fecha).getTime();
}

export type ResultadoCreacionPostulacion =
  | {
      ok: true;
    }
  | {
      ok: false;
      motivo:
        | "ROL_NO_PERMITIDO"
        | "PROYECTO_NO_PERTENECE_AL_USUARIO"
        | "PROYECTO_INACTIVO"
        | "EVENTO_NO_PUBLICADO"
        | "EVENTO_YA_COMENZO"
        | "POSTULACION_DUPLICADA";
    };

/**
 * Valida si un músico puede postular su proyecto a un evento.
 */
export function validarCreacionPostulacion(params: {
  rolUsuario: RolUsuario;
  proyecto: {
    usuarioId: string;
    estaActivo: boolean;
  };
  evento: {
    estado: EstadoEvento;
    startsAt: Date | string | number;
  };
  usuarioId: string;
  postulacionExistente: boolean;
  ahora: Date | string | number;
}): ResultadoCreacionPostulacion {
  const { rolUsuario, proyecto, evento, usuarioId, postulacionExistente, ahora } = params;

  // 1. Rol debe ser MUSICO
  if (rolUsuario !== "MUSICO") {
    return { ok: false, motivo: "ROL_NO_PERMITIDO" };
  }

  // 2. El proyecto debe pertenecer al usuario
  if (proyecto.usuarioId !== usuarioId) {
    return { ok: false, motivo: "PROYECTO_NO_PERTENECE_AL_USUARIO" };
  }

  // 3. El proyecto debe estar activo
  if (!proyecto.estaActivo) {
    return { ok: false, motivo: "PROYECTO_INACTIVO" };
  }

  // 4. El evento debe estar PUBLICADO
  if (evento.estado !== "PUBLICADO") {
    return { ok: false, motivo: "EVENTO_NO_PUBLICADO" };
  }

  // 5. El evento no debe haber comenzado: ahora < evento.startsAt
  const tsAhora = aTimestamp(ahora);
  const tsInicio = aTimestamp(evento.startsAt);
  if (tsAhora >= tsInicio) {
    return { ok: false, motivo: "EVENTO_YA_COMENZO" };
  }

  // 6. No debe existir postulación duplicada para ese proyecto en ese evento
  if (postulacionExistente) {
    return { ok: false, motivo: "POSTULACION_DUPLICADA" };
  }

  return {
    ok: true,
  };
}

export type ResultadoCancelacionPostulacion =
  | {
      ok: true;
    }
  | {
      ok: false;
      motivo: "USUARIO_NO_PROPIETARIO" | "POSTULACION_NO_PENDIENTE";
    };

/**
 * Valida si un músico puede cancelar su postulación (solo PENDIENTE).
 */
export function validarCancelacionPostulacion(params: {
  postulacion: {
    musicoId: string;
    estado: EstadoPostulacion;
  };
  usuarioId: string;
}): ResultadoCancelacionPostulacion {
  const { postulacion, usuarioId } = params;

  if (postulacion.musicoId !== usuarioId) {
    return { ok: false, motivo: "USUARIO_NO_PROPIETARIO" };
  }

  if (postulacion.estado !== "PENDIENTE") {
    return { ok: false, motivo: "POSTULACION_NO_PENDIENTE" };
  }

  return {
    ok: true,
  };
}

export type ResultadoAceptacionPostulacion =
  | {
      ok: true;
    }
  | {
      ok: false;
      motivo:
        | "USUARIO_NO_ORGANIZADOR"
        | "POSTULACION_NO_PENDIENTE"
        | "EVENTO_NO_PUBLICADO"
        | "CONTRATACION_DUPLICADA";
    };

/**
 * Valida si un organizador puede aceptar una postulación recibida en su evento.
 */
export function validarAceptacionPostulacion(params: {
  postulacion: {
    estado: EstadoPostulacion;
  };
  evento: {
    organizadorId: string;
    estado: EstadoEvento;
  };
  usuarioId: string;
  contratacionExistente: boolean;
}): ResultadoAceptacionPostulacion {
  const { postulacion, evento, usuarioId, contratacionExistente } = params;

  if (evento.organizadorId !== usuarioId) {
    return { ok: false, motivo: "USUARIO_NO_ORGANIZADOR" };
  }

  if (postulacion.estado !== "PENDIENTE") {
    return { ok: false, motivo: "POSTULACION_NO_PENDIENTE" };
  }

  if (evento.estado !== "PUBLICADO") {
    return { ok: false, motivo: "EVENTO_NO_PUBLICADO" };
  }

  if (contratacionExistente) {
    return { ok: false, motivo: "CONTRATACION_DUPLICADA" };
  }

  return {
    ok: true,
  };
}

export type ResultadoRechazoPostulacion =
  | {
      ok: true;
    }
  | {
      ok: false;
      motivo: "USUARIO_NO_ORGANIZADOR" | "POSTULACION_NO_PENDIENTE";
    };

/**
 * Valida si un organizador puede rechazar una postulación pendiente.
 */
export function validarRechazoPostulacion(params: {
  postulacion: {
    estado: EstadoPostulacion;
  };
  evento: {
    organizadorId: string;
  };
  usuarioId: string;
}): ResultadoRechazoPostulacion {
  const { postulacion, evento, usuarioId } = params;

  if (evento.organizadorId !== usuarioId) {
    return { ok: false, motivo: "USUARIO_NO_ORGANIZADOR" };
  }

  if (postulacion.estado !== "PENDIENTE") {
    return { ok: false, motivo: "POSTULACION_NO_PENDIENTE" };
  }

  return {
    ok: true,
  };
}

/**
 * Filtra las otras postulaciones del mismo músico en el mismo evento
 * que deben cancelarse automáticamente cuando una es aceptada.
 */
export function identificarPostulacionesACancelar(params: {
  postulacionAceptadaId: string;
  musicoId: string;
  eventoId: string;
  postulaciones: Array<{
    id: string;
    musicoId: string;
    eventoId: string;
    estado: EstadoPostulacion;
  }>;
}): string[] {
  const { postulacionAceptadaId, musicoId, eventoId, postulaciones } = params;

  return postulaciones
    .filter(
      (p) =>
        p.id !== postulacionAceptadaId &&
        p.musicoId === musicoId &&
        p.eventoId === eventoId &&
        p.estado === "PENDIENTE"
    )
    .map((p) => p.id);
}

