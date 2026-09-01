/**
 * Tipos de dominio compartidos en toda la aplicación.
 * Corresponden a las entidades definidas en docs/spec.md
 */

/**
 * Roles funcionales definidos en el MVP
 * @see docs/spec.md § 3. Roles
 */
export enum UserRole {
  MUSICIAN = "MUSICIAN",
  ORGANIZER = "ORGANIZER",
  PUBLIC = "PUBLIC", // No autenticado
}

/**
 * Estados posibles de un evento
 * @see docs/spec.md § 4. Entidades
 */
export enum EventStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

/**
 * Estados posibles de una contratación
 * @see docs/spec.md § 4. Entidades y § 7. Reglas de negocio
 */
export enum ContractStatus {
  PENDING = "PENDING", // Postulación inicial o propuesta inicial
  NEGOTIATING = "NEGOTIATING", // En negociación de ofertas
  AGREED = "AGREED", // Oferta aceptada / acuerdo cerrado
  CANCELLED = "CANCELLED", // Cancelada por alguna de las partes
  COMPLETED = "COMPLETED", // Evento finalizado
  REJECTED = "REJECTED", // Postulación o negociación rechazada
}

/**
 * Estados posibles de una oferta
 * @see docs/spec.md § 4. Entidades y H6
 */
export enum OfferStatus {
  PROPOSED = "PROPOSED", // Propuesta o contraoferta vigente
  REJECTED = "REJECTED", // Rechazada
  COUNTERED = "COUNTERED", // Reemplazada por una nueva contraoferta
  ACCEPTED = "ACCEPTED", // Aceptada por la otra parte
}

/**
 * Tipos de entrada conceptuales
 * @see docs/spec.md § 4. Entidades
 */
export enum TicketType {
  GENERAL = "GENERAL",
  VIP = "VIP",
  ANTICIPADA = "ANTICIPADA",
  ENTRADA_LIBRE = "ENTRADA_LIBRE",
}

/**
 * Perfil de usuario en la base de datos
 */
export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "MUSICIAN" | "ORGANIZER";
  avatar_url?: string | null;
  bio?: string | null;
  phone?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Representación de un usuario autenticado
 * @see docs/spec.md § 4. Entidades
 */
export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

/**
 * Proyecto musical administrado por un músico
 * @see docs/spec.md § 4. Entidades y H2
 */
export interface MusicalProject {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  genre: string;
  approximate_cache?: number | null;
  location?: string | null;
  city?: string | null;
  image_url?: string | null;
  spotify_url?: string | null;
  youtube_url?: string | null;
  instagram_url?: string | null;
  website_url?: string | null;
  custom_links?: Array<{ title: string; url: string }>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Evento publicado por un organizador
 * @see docs/spec.md § 4. Entidades y H3
 */
export interface Event {
  id: string;
  organizer_id: string;
  title: string;
  description?: string | null;
  event_date: string;
  location: string;
  venue_name?: string | null;
  city?: string | null;
  required_musicians_count: number;
  offered_cache?: number | null;
  status: EventStatus;
  banner_url?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Contratación entre un evento y un proyecto musical
 * @see docs/spec.md § 4. Entidades y H7
 */
export interface Contract {
  id: string;
  event_id: string;
  musical_project_id: string;
  organizer_id: string;
  musician_id: string;
  status: ContractStatus;
  agreed_amount?: number | null;
  agreed_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Oferta o propuesta económica dentro de una contratación
 * @see docs/spec.md § 4. Entidades y H6
 */
export interface Offer {
  id: string;
  contract_id: string;
  sender_id: string;
  amount: number;
  message?: string | null;
  status: OfferStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Valoración posterior a la realización de un evento
 * @see docs/spec.md § 4. Entidades y H8, H9
 */
export interface Rating {
  id: string;
  contract_id: string;
  author_id: string;
  target_id: string;
  target_project_id?: string | null;
  score: number; // 1 a 5
  comment?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Información conceptual de entradas para un evento (MVP)
 * @see docs/spec.md § 4. Entidades
 */
export interface TicketInfo {
  id: string;
  event_id: string;
  ticket_type: string;
  price: number;
  capacity?: number | null;
  description?: string | null;
  external_purchase_url?: string | null;
  is_free: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Sesión del usuario actual
 */
export interface Session {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
}

/**
 * Tipo para respuestas de error estándar
 */
export interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Tipo para respuestas exitosas
 */
export interface SuccessResponse<T> {
  data: T;
  message?: string;
}
