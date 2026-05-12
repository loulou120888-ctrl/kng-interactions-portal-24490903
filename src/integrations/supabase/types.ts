export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      announcement_reads: {
        Row: {
          announcement_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      hall_of_fame: {
        Row: {
          author_id: string
          caption: string | null
          created_at: string
          frame_id: string
          id: string
          image_url: string
          winner_id: string | null
        }
        Insert: {
          author_id: string
          caption?: string | null
          created_at?: string
          frame_id: string
          id?: string
          image_url: string
          winner_id?: string | null
        }
        Update: {
          author_id?: string
          caption?: string | null
          created_at?: string
          frame_id?: string
          id?: string
          image_url?: string
          winner_id?: string | null
        }
        Relationships: []
      }
      interaction_attendees: {
        Row: {
          interaction_id: string
          user_id: string
        }
        Insert: {
          interaction_id: string
          user_id: string
        }
        Update: {
          interaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interaction_attendees_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
        ]
      }
      interaction_winners: {
        Row: {
          comped: boolean
          comped_at: string | null
          comped_by: string | null
          created_at: string
          id: string
          interaction_id: string
          prize_code: string
          prize_name: string | null
          quantity: number
          winner_id: string
        }
        Insert: {
          comped?: boolean
          comped_at?: string | null
          comped_by?: string | null
          created_at?: string
          id?: string
          interaction_id: string
          prize_code: string
          prize_name?: string | null
          quantity?: number
          winner_id: string
        }
        Update: {
          comped?: boolean
          comped_at?: string | null
          comped_by?: string | null
          created_at?: string
          id?: string
          interaction_id?: string
          prize_code?: string
          prize_name?: string | null
          quantity?: number
          winner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interaction_winners_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          author_id: string
          created_at: string
          department: Database["public"]["Enums"]["department"]
          id: string
          location: string | null
          slot_id: string | null
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          created_at?: string
          department: Database["public"]["Enums"]["department"]
          id?: string
          location?: string | null
          slot_id?: string | null
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          department?: Database["public"]["Enums"]["department"]
          id?: string
          location?: string | null
          slot_id?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "schedule_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      points_log: {
        Row: {
          amount: number
          awarded_at: string
          id: string
          interaction_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          awarded_at?: string
          id?: string
          interaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          awarded_at?: string
          id?: string
          interaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_log_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
        ]
      }
      prizes: {
        Row: {
          code: string
          created_at: string
          default_quantity: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          default_quantity?: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          default_quantity?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: Database["public"]["Enums"]["department"] | null
          display_name: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["department"] | null
          display_name: string
          id: string
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["department"] | null
          display_name?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      schedule_slots: {
        Row: {
          booked_by: string
          created_at: string
          department: Database["public"]["Enums"]["department"]
          id: string
          interaction_id: string | null
          notes: string | null
          schedule_type: Database["public"]["Enums"]["schedule_type"]
          slot_start: string
          status: Database["public"]["Enums"]["slot_status"]
          title: string
          updated_at: string
        }
        Insert: {
          booked_by: string
          created_at?: string
          department: Database["public"]["Enums"]["department"]
          id?: string
          interaction_id?: string | null
          notes?: string | null
          schedule_type: Database["public"]["Enums"]["schedule_type"]
          slot_start: string
          status?: Database["public"]["Enums"]["slot_status"]
          title: string
          updated_at?: string
        }
        Update: {
          booked_by?: string
          created_at?: string
          department?: Database["public"]["Enums"]["department"]
          id?: string
          interaction_id?: string | null
          notes?: string | null
          schedule_type?: Database["public"]["Enums"]["schedule_type"]
          slot_start?: string
          status?: Database["public"]["Enums"]["slot_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      signup_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          department: Database["public"]["Enums"]["department"] | null
          id: string
          revoked: boolean
          role: Database["public"]["Enums"]["app_role"]
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          department?: Database["public"]["Enums"]["department"] | null
          id?: string
          revoked?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          department?: Database["public"]["Enums"]["department"] | null
          id?: string
          revoked?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_aux_plus: { Args: { _user_id: string }; Returns: boolean }
      is_manager: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "member" | "sld" | "ld" | "aux" | "adm" | "manager"
      department: "events" | "parties" | "entertainment"
      schedule_type: "events_parties" | "entertainment"
      slot_status: "booked" | "in_progress" | "completed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["member", "sld", "ld", "aux", "adm", "manager"],
      department: ["events", "parties", "entertainment"],
      schedule_type: ["events_parties", "entertainment"],
      slot_status: ["booked", "in_progress", "completed", "cancelled"],
    },
  },
} as const
