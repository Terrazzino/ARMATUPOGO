/**
 * Tipos derivados del schema de la base de datos PostgreSQL en Supabase.
 * Define la estructura exacta de las tablas, inserciones y actualizaciones.
 *
 * @see docs/spec.md § 4. Entidades
 * @see docs/DATABASE.md
 * @see supabase/migrations/00001_initial_schema.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profile_users: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          role: "MUSICIAN" | "ORGANIZER";
          avatar_url: string | null;
          bio: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          role: "MUSICIAN" | "ORGANIZER";
          avatar_url?: string | null;
          bio?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          role?: "MUSICIAN" | "ORGANIZER";
          avatar_url?: string | null;
          bio?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      musical_projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          genre: string;
          approximate_cache: number | null;
          location: string | null;
          city: string | null;
          image_url: string | null;
          spotify_url: string | null;
          youtube_url: string | null;
          instagram_url: string | null;
          website_url: string | null;
          custom_links: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
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
          custom_links?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          genre?: string;
          approximate_cache?: number | null;
          location?: string | null;
          city?: string | null;
          image_url?: string | null;
          spotify_url?: string | null;
          youtube_url?: string | null;
          instagram_url?: string | null;
          website_url?: string | null;
          custom_links?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          organizer_id: string;
          title: string;
          description: string | null;
          event_date: string;
          location: string;
          venue_name: string | null;
          city: string | null;
          required_musicians_count: number;
          offered_cache: number | null;
          status: "DRAFT" | "PUBLISHED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
          banner_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organizer_id: string;
          title: string;
          description?: string | null;
          event_date: string;
          location: string;
          venue_name?: string | null;
          city?: string | null;
          required_musicians_count?: number;
          offered_cache?: number | null;
          status?: "DRAFT" | "PUBLISHED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
          banner_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organizer_id?: string;
          title?: string;
          description?: string | null;
          event_date?: string;
          location?: string;
          venue_name?: string | null;
          city?: string | null;
          required_musicians_count?: number;
          offered_cache?: number | null;
          status?: "DRAFT" | "PUBLISHED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
          banner_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      contracts: {
        Row: {
          id: string;
          event_id: string;
          musical_project_id: string;
          organizer_id: string;
          musician_id: string;
          status: "PENDING" | "NEGOTIATING" | "AGREED" | "CANCELLED" | "COMPLETED" | "REJECTED";
          agreed_amount: number | null;
          agreed_at: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          musical_project_id: string;
          organizer_id: string;
          musician_id: string;
          status?: "PENDING" | "NEGOTIATING" | "AGREED" | "CANCELLED" | "COMPLETED" | "REJECTED";
          agreed_amount?: number | null;
          agreed_at?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          musical_project_id?: string;
          organizer_id?: string;
          musician_id?: string;
          status?: "PENDING" | "NEGOTIATING" | "AGREED" | "CANCELLED" | "COMPLETED" | "REJECTED";
          agreed_amount?: number | null;
          agreed_at?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      offers: {
        Row: {
          id: string;
          contract_id: string;
          sender_id: string;
          amount: number;
          message: string | null;
          status: "PROPOSED" | "ACCEPTED" | "REJECTED" | "COUNTERED";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          contract_id: string;
          sender_id: string;
          amount: number;
          message?: string | null;
          status?: "PROPOSED" | "ACCEPTED" | "REJECTED" | "COUNTERED";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          contract_id?: string;
          sender_id?: string;
          amount?: number;
          message?: string | null;
          status?: "PROPOSED" | "ACCEPTED" | "REJECTED" | "COUNTERED";
          created_at?: string;
          updated_at?: string;
        };
      };
      ratings: {
        Row: {
          id: string;
          contract_id: string;
          author_id: string;
          target_id: string;
          target_project_id: string | null;
          score: number;
          comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          contract_id: string;
          author_id: string;
          target_id: string;
          target_project_id?: string | null;
          score: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          contract_id?: string;
          author_id?: string;
          target_id?: string;
          target_project_id?: string | null;
          score?: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tickets: {
        Row: {
          id: string;
          event_id: string;
          ticket_type: string;
          price: number;
          capacity: number | null;
          description: string | null;
          external_purchase_url: string | null;
          is_free: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          ticket_type?: string;
          price?: number;
          capacity?: number | null;
          description?: string | null;
          external_purchase_url?: string | null;
          is_free?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          ticket_type?: string;
          price?: number;
          capacity?: number | null;
          description?: string | null;
          external_purchase_url?: string | null;
          is_free?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

export type ProfileUserRow = Database["public"]["Tables"]["profile_users"]["Row"];
export type ProfileUserInsert = Database["public"]["Tables"]["profile_users"]["Insert"];
export type ProfileUserUpdate = Database["public"]["Tables"]["profile_users"]["Update"];

export type MusicalProjectRow = Database["public"]["Tables"]["musical_projects"]["Row"];
export type MusicalProjectInsert = Database["public"]["Tables"]["musical_projects"]["Insert"];
export type MusicalProjectUpdate = Database["public"]["Tables"]["musical_projects"]["Update"];

export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
export type EventUpdate = Database["public"]["Tables"]["events"]["Update"];

export type ContractRow = Database["public"]["Tables"]["contracts"]["Row"];
export type ContractInsert = Database["public"]["Tables"]["contracts"]["Insert"];
export type ContractUpdate = Database["public"]["Tables"]["contracts"]["Update"];

export type OfferRow = Database["public"]["Tables"]["offers"]["Row"];
export type OfferInsert = Database["public"]["Tables"]["offers"]["Insert"];
export type OfferUpdate = Database["public"]["Tables"]["offers"]["Update"];

export type RatingRow = Database["public"]["Tables"]["ratings"]["Row"];
export type RatingInsert = Database["public"]["Tables"]["ratings"]["Insert"];
export type RatingUpdate = Database["public"]["Tables"]["ratings"]["Update"];

export type TicketRow = Database["public"]["Tables"]["tickets"]["Row"];
export type TicketInsert = Database["public"]["Tables"]["tickets"]["Insert"];
export type TicketUpdate = Database["public"]["Tables"]["tickets"]["Update"];
