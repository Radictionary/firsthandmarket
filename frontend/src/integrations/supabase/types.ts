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
      boundaries: {
        Row: {
          active: boolean
          created_at: string
          id: string
          rule: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          rule: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          rule?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      intake_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          agent_api_key: string | null
          agent_email: string | null
          agent_id: string | null
          agent_username: string | null
          coworker_id: string | null
          created_at: string
          crm_contact_id: string | null
          id: string
          provider: string
          sync_state: string
          updated_at: string
          user_id: string
          workspace_slug: string | null
        }
        Insert: {
          agent_api_key?: string | null
          agent_email?: string | null
          agent_id?: string | null
          agent_username?: string | null
          coworker_id?: string | null
          created_at?: string
          crm_contact_id?: string | null
          id?: string
          provider?: string
          sync_state?: string
          updated_at?: string
          user_id: string
          workspace_slug?: string | null
        }
        Update: {
          agent_api_key?: string | null
          agent_email?: string | null
          agent_id?: string | null
          agent_username?: string | null
          coworker_id?: string | null
          created_at?: string
          crm_contact_id?: string | null
          id?: string
          provider?: string
          sync_state?: string
          updated_at?: string
          user_id?: string
          workspace_slug?: string | null
        }
        Relationships: []
      }
      introduction_sides: {
        Row: {
          counterpart_id: string
          created_at: string
          decided_at: string | null
          decision: string
          id: string
          introduction_id: string
          not_asking: string
          recommendation: string
          the_ask: string
          updated_at: string
          user_id: string
          why_meet: string
          why_they_want: string
        }
        Insert: {
          counterpart_id: string
          created_at?: string
          decided_at?: string | null
          decision?: string
          id?: string
          introduction_id: string
          not_asking: string
          recommendation?: string
          the_ask: string
          updated_at?: string
          user_id: string
          why_meet: string
          why_they_want: string
        }
        Update: {
          counterpart_id?: string
          created_at?: string
          decided_at?: string | null
          decision?: string
          id?: string
          introduction_id?: string
          not_asking?: string
          recommendation?: string
          the_ask?: string
          updated_at?: string
          user_id?: string
          why_meet?: string
          why_they_want?: string
        }
        Relationships: [
          {
            foreignKeyName: "introduction_sides_introduction_id_fkey"
            columns: ["introduction_id"]
            isOneToOne: false
            referencedRelation: "introductions"
            referencedColumns: ["id"]
          },
        ]
      }
      introductions: {
        Row: {
          created_at: string
          id: string
          scheduled_at: string | null
          status: string
          time_ask: string | null
          topic: string | null
          updated_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          scheduled_at?: string | null
          status?: string
          time_ask?: string | null
          topic?: string | null
          updated_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          scheduled_at?: string | null
          status?: string
          time_ask?: string | null
          topic?: string | null
          updated_at?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      invites: {
        Row: {
          brief: string
          claimed_by: string | null
          created_at: string
          email: string
          expires_at: string
          full_name: string
          id: string
          status: string
          token: string
        }
        Insert: {
          brief: string
          claimed_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          full_name: string
          id?: string
          status?: string
          token?: string
        }
        Update: {
          brief?: string
          claimed_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          status?: string
          token?: string
        }
        Relationships: []
      }
      mandate_facts: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          tier: Database["public"]["Enums"]["fact_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          tier?: Database["public"]["Enums"]["fact_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          tier?: Database["public"]["Enums"]["fact_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      match_attempts: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          result: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          result: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          result?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      negotiations: {
        Row: {
          created_at: string
          id: string
          introduction_id: string | null
          outcome: string
          transcript: Json
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          introduction_id?: string | null
          outcome?: string
          transcript?: Json
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          introduction_id?: string | null
          outcome?: string
          transcript?: Json
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "negotiations_introduction_id_fkey"
            columns: ["introduction_id"]
            isOneToOne: false
            referencedRelation: "introductions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          headline: string | null
          id: string
          intake_complete: boolean
          is_seed: boolean
          paused: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          headline?: string | null
          id: string
          intake_complete?: boolean
          is_seed?: boolean
          paused?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          headline?: string | null
          id?: string
          intake_complete?: boolean
          is_seed?: boolean
          paused?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      representation_requests: {
        Row: {
          boundaries: string | null
          created_at: string
          email: string
          full_name: string
          goal: string
          id: string
          role_title: string | null
        }
        Insert: {
          boundaries?: string | null
          created_at?: string
          email: string
          full_name: string
          goal: string
          id?: string
          role_title?: string | null
        }
        Update: {
          boundaries?: string | null
          created_at?: string
          email?: string
          full_name?: string
          goal?: string
          id?: string
          role_title?: string | null
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Enums: {
      app_role: "operator" | "member"
      fact_tier: "public" | "agent_visible" | "never"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["operator", "member"],
      fact_tier: ["public", "agent_visible", "never"],
    },
  },
} as const
