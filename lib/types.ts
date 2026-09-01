/**
 * Tipos de dominio compartidos en toda la aplicación (Arma tu pogo).
 * Corresponden a las entidades y enums definidos en prisma/schema.prisma y docs/spec.md
 */

export type RolUsuario = "MUSICO" | "ORGANIZADOR";

export type EstadoEvento =
  | "BORRADOR"
  | "PUBLICADO"
  | "EN_CURSO"
  | "COMPLETADO"
  | "CANCELADO";

export type EstadoContratacion =
  | "PENDIENTE"
  | "NEGOCIANDO"
  | "ACORDADO"
  | "CANCELADO"
  | "COMPLETADO"
  | "RECHAZADO";

export type EstadoOferta =
  | "PROPUESTA"
  | "ACEPTADA"
  | "RECHAZADA"
  | "CONTRAOFERTADA";

export type TipoEntrada = "GENERAL" | "VIP" | "ANTICIPADA" | "ENTRADA_LIBRE";

/**
 * Representación de un usuario en el sistema
 */
export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: RolUsuario;
  fotoPerfilUrl?: string | null;
  biografia?: string | null;
  telefono?: string | null;
  creadoEn: Date | string;
  actualizadoEn: Date | string;
}

/**
 * Proyecto musical administrado por un músico
 */
export interface ProyectoMusical {
  id: string;
  usuarioId: string;
  nombre: string;
  descripcion?: string | null;
  genero: string;
  cacheAproximado?: number | string | null;
  ubicacion?: string | null;
  ciudad?: string | null;
  imagenUrl?: string | null;
  spotifyUrl?: string | null;
  youtubeUrl?: string | null;
  instagramUrl?: string | null;
  sitioWebUrl?: string | null;
  enlacesPersonalizados?: Array<{ title: string; url: string }>;
  estaActivo: boolean;
  creadoEn: Date | string;
  actualizadoEn: Date | string;
}

/**
 * Evento o recital publicado por un organizador
 */
export interface Evento {
  id: string;
  organizadorId: string;
  titulo: string;
  descripcion?: string | null;
  fechaEvento: Date | string;
  ubicacion: string;
  nombreLugar?: string | null;
  ciudad?: string | null;
  cantidadMusicosRequerida: number;
  cacheOfrecido?: number | string | null;
  estado: EstadoEvento;
  bannerUrl?: string | null;
  creadoEn: Date | string;
  actualizadoEn: Date | string;
}

/**
 * Contratación y postulación entre un evento y un proyecto musical
 */
export interface Contratacion {
  id: string;
  eventoId: string;
  proyectoMusicalId: string;
  organizadorId: string;
  musicoId: string;
  estado: EstadoContratacion;
  montoPactado?: number | string | null;
  fechaAcuerdo?: Date | string | null;
  fechaCancelacion?: Date | string | null;
  motivoCancelacion?: string | null;
  creadoPorId: string;
  creadoEn: Date | string;
  actualizadoEn: Date | string;
}

/**
 * Oferta o contraoferta económica dentro de una negociación
 */
export interface Oferta {
  id: string;
  contratacionId: string;
  remitenteId: string;
  monto: number | string;
  mensaje?: string | null;
  estado: EstadoOferta;
  creadoEn: Date | string;
  actualizadoEn: Date | string;
}

/**
 * Valoración mutua post-recital
 */
export interface Valoracion {
  id: string;
  contratacionId: string;
  autorId: string;
  destinatarioId: string;
  proyectoDestinatarioId?: string | null;
  puntaje: number;
  comentario?: string | null;
  creadoEn: Date | string;
  actualizadoEn: Date | string;
}

/**
 * Entradas para un evento
 */
export interface Entrada {
  id: string;
  eventoId: string;
  tipoEntrada: string;
  precio: number | string;
  capacidad?: number | null;
  descripcion?: string | null;
  urlCompraExterna?: string | null;
  esGratuita: boolean;
  creadoEn: Date | string;
  actualizadoEn: Date | string;
}