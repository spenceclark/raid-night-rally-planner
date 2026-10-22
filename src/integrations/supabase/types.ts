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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          created_at: string
          dedupe_key: string
          guild_id: string
          id: string
          kind: string
          message: string
          raid_id: string
          signup_id: string | null
          status: Database["public"]["Enums"]["alert_status"]
          webhook_notified_at: string | null
        }
        Insert: {
          created_at?: string
          dedupe_key: string
          guild_id: string
          id?: string
          kind?: string
          message: string
          raid_id: string
          signup_id?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          webhook_notified_at?: string | null
        }
        Update: {
          created_at?: string
          dedupe_key?: string
          guild_id?: string
          id?: string
          kind?: string
          message?: string
          raid_id?: string
          signup_id?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          webhook_notified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_raid_id_fkey"
            columns: ["raid_id"]
            isOneToOne: false
            referencedRelation: "raids"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          detail: Json
          entity: string
          entity_id: string | null
          guild_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          entity?: string
          entity_id?: string | null
          guild_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          entity?: string
          entity_id?: string | null
          guild_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          class_name: string
          created_at: string
          guild_id: string
          id: string
          name: string
          roles: Database["public"]["Enums"]["raid_role"][]
          user_id: string
          willing_to_switch: boolean
        }
        Insert: {
          class_name?: string
          created_at?: string
          guild_id: string
          id?: string
          name: string
          roles?: Database["public"]["Enums"]["raid_role"][]
          user_id: string
          willing_to_switch?: boolean
        }
        Update: {
          class_name?: string
          created_at?: string
          guild_id?: string
          id?: string
          name?: string
          roles?: Database["public"]["Enums"]["raid_role"][]
          user_id?: string
          willing_to_switch?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "characters_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_seed_mappings: {
        Row: {
          character_id: string | null
          created_at: string
          id: string
          raid_id: string
          seed_key: string
          user_id: string
        }
        Insert: {
          character_id?: string | null
          created_at?: string
          id?: string
          raid_id: string
          seed_key: string
          user_id: string
        }
        Update: {
          character_id?: string | null
          created_at?: string
          id?: string
          raid_id?: string
          seed_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_seed_mappings_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_seed_mappings_raid_id_fkey"
            columns: ["raid_id"]
            isOneToOne: false
            referencedRelation: "raids"
            referencedColumns: ["id"]
          },
        ]
      }
      guilds: {
        Row: {
          created_at: string
          created_by: string | null
          demo_scenario: string | null
          id: string
          invite_code: string
          is_demo: boolean
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          demo_scenario?: string | null
          id?: string
          invite_code?: string
          is_demo?: boolean
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          demo_scenario?: string | null
          id?: string
          invite_code?: string
          is_demo?: boolean
          name?: string
        }
        Relationships: []
      }
      memberships: {
        Row: {
          created_at: string
          display_name: string
          guild_id: string
          id: string
          role: Database["public"]["Enums"]["guild_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          guild_id: string
          id?: string
          role?: Database["public"]["Enums"]["guild_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          guild_id?: string
          id?: string
          role?: Database["public"]["Enums"]["guild_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      proposed_actions: {
        Row: {
          alert_id: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          guild_id: string
          id: string
          proposal: string
          raid_id: string
          status: string
        }
        Insert: {
          alert_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          guild_id: string
          id?: string
          proposal: string
          raid_id: string
          status?: string
        }
        Update: {
          alert_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          guild_id?: string
          id?: string
          proposal?: string
          raid_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposed_actions_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposed_actions_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposed_actions_raid_id_fkey"
            columns: ["raid_id"]
            isOneToOne: false
            referencedRelation: "raids"
            referencedColumns: ["id"]
          },
        ]
      }
      raids: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          ends_at: string
          guild_id: string
          id: string
          idempotency_key: string | null
          invites_at: string | null
          notes: string
          req_damage: number
          req_healers: number
          req_tanks: number
          starts_at: string
          status: string
          time_zone: string
          title: string
        }
        Insert: {
          content?: string
          created_at?: string
          created_by?: string | null
          ends_at: string
          guild_id: string
          id?: string
          idempotency_key?: string | null
          invites_at?: string | null
          notes?: string
          req_damage?: number
          req_healers?: number
          req_tanks?: number
          starts_at: string
          status?: string
          time_zone?: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string
          guild_id?: string
          id?: string
          idempotency_key?: string | null
          invites_at?: string | null
          notes?: string
          req_damage?: number
          req_healers?: number
          req_tanks?: number
          starts_at?: string
          status?: string
          time_zone?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "raids_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      signups: {
        Row: {
          availability_end: string | null
          availability_note: string
          availability_start: string | null
          character_id: string | null
          character_name: string | null
          class_name: string | null
          contact_ok: boolean | null
          created_at: string
          id: string
          note: string
          player_name: string | null
          raid_id: string
          role: Database["public"]["Enums"]["raid_role"]
          seed_key: string | null
          status: Database["public"]["Enums"]["signup_status"]
          switch_note: string
          switch_offers: Database["public"]["Enums"]["raid_role"][]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          availability_end?: string | null
          availability_note?: string
          availability_start?: string | null
          character_id?: string | null
          character_name?: string | null
          class_name?: string | null
          contact_ok?: boolean | null
          created_at?: string
          id?: string
          note?: string
          player_name?: string | null
          raid_id: string
          role: Database["public"]["Enums"]["raid_role"]
          seed_key?: string | null
          status?: Database["public"]["Enums"]["signup_status"]
          switch_note?: string
          switch_offers?: Database["public"]["Enums"]["raid_role"][]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          availability_end?: string | null
          availability_note?: string
          availability_start?: string | null
          character_id?: string | null
          character_name?: string | null
          class_name?: string | null
          contact_ok?: boolean | null
          created_at?: string
          id?: string
          note?: string
          player_name?: string | null
          raid_id?: string
          role?: Database["public"]["Enums"]["raid_role"]
          seed_key?: string | null
          status?: Database["public"]["Enums"]["signup_status"]
          switch_note?: string
          switch_offers?: Database["public"]["Enums"]["raid_role"][]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signups_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signups_raid_id_fkey"
            columns: ["raid_id"]
            isOneToOne: false
            referencedRelation: "raids"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_guild_leader: { Args: { _guild_id: string }; Returns: boolean }
      is_guild_member: { Args: { _guild_id: string }; Returns: boolean }
      join_guild_by_invite: {
        Args: { _display_name: string; _invite_code: string }
        Returns: string
      }
    }
    Enums: {
      alert_status: "recorded" | "retrieved" | "delivered"
      guild_role: "leader" | "member"
      raid_role: "tank" | "healer" | "damage"
      signup_status:
        | "confirmed"
        | "tentative"
        | "unavailable"
        | "standby"
        | "no_response"
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
      alert_status: ["recorded", "retrieved", "delivered"],
      guild_role: ["leader", "member"],
      raid_role: ["tank", "healer", "damage"],
      signup_status: [
        "confirmed",
        "tentative",
        "unavailable",
        "standby",
        "no_response",
      ],
    },
  },
} as const
