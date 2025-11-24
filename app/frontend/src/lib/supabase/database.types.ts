/**
 * Database types for Supabase
 * Auto-generated using: supabase gen types typescript --local
 *
 * To regenerate: pnpm supabase gen types typescript --local > src/lib/supabase/database.types.ts
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
      customers: {
        Row: {
          wa_id: string;
          customer_name: string | null;
          age: number | null;
          age_recorded_at: string | null;
          document: Json | null;
          is_blocked: boolean;
          is_favorite: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          wa_id: string;
          customer_name?: string | null;
          age?: number | null;
          age_recorded_at?: string | null;
          document?: Json | null;
          is_blocked?: boolean;
          is_favorite?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          wa_id?: string;
          customer_name?: string | null;
          age?: number | null;
          age_recorded_at?: string | null;
          document?: Json | null;
          is_blocked?: boolean;
          is_favorite?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      conversation: {
        Row: {
          id: number;
          wa_id: string;
          role: string | null;
          message: string | null;
          date: string | null;
          time: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          wa_id: string;
          role?: string | null;
          message?: string | null;
          date?: string | null;
          time?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          wa_id?: string;
          role?: string | null;
          message?: string | null;
          date?: string | null;
          time?: string | null;
          created_at?: string;
        };
      };
      reservations: {
        Row: {
          id: number;
          wa_id: string;
          date: string;
          time_slot: string;
          type: number;
          status: string;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          wa_id: string;
          date: string;
          time_slot: string;
          type: number;
          status?: string;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          wa_id?: string;
          date?: string;
          time_slot?: string;
          type?: number;
          status?: string;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      vacation_periods: {
        Row: {
          id: number;
          start_date: string;
          end_date: string | null;
          duration_days: number | null;
          title: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          start_date: string;
          end_date?: string | null;
          duration_days?: number | null;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          start_date?: string;
          end_date?: string | null;
          duration_days?: number | null;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      notification_events: {
        Row: {
          id: number;
          event_type: string;
          ts_iso: string;
          data: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          event_type: string;
          ts_iso: string;
          data: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          event_type?: string;
          ts_iso?: string;
          data?: string;
          created_at?: string;
        };
      };
      inbound_message_queue: {
        Row: {
          id: number;
          message_id: string | null;
          wa_id: string | null;
          payload: string;
          status: string;
          attempts: number;
          created_at: string;
          updated_at: string;
          locked_at: string | null;
        };
        Insert: {
          id?: number;
          message_id?: string | null;
          wa_id?: string | null;
          payload: string;
          status?: string;
          attempts?: number;
          created_at?: string;
          updated_at?: string;
          locked_at?: string | null;
        };
        Update: {
          id?: number;
          message_id?: string | null;
          wa_id?: string | null;
          payload?: string;
          status?: string;
          attempts?: number;
          created_at?: string;
          updated_at?: string;
          locked_at?: string | null;
        };
      };
      app_config: {
        Row: {
          id: number;
          config_data: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          config_data: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          config_data?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      normalize_arabic: {
        Args: { text: string };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
