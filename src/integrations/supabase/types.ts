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
      competition_members: {
        Row: {
          competition_id: string
          decided_at: string | null
          decided_by: string | null
          id: string
          requested_at: string
          status: Database["public"]["Enums"]["member_status"]
          user_id: string
        }
        Insert: {
          competition_id: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          requested_at?: string
          status?: Database["public"]["Enums"]["member_status"]
          user_id: string
        }
        Update: {
          competition_id?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          requested_at?: string
          status?: Database["public"]["Enums"]["member_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_members_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          finished_at: string | null
          id: string
          name: string
          rules_version: Database["public"]["Enums"]["rules_version"]
          squad_points_limit: number
          started_at: string | null
          status: Database["public"]["Enums"]["competition_status"]
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          finished_at?: string | null
          id?: string
          name: string
          rules_version?: Database["public"]["Enums"]["rules_version"]
          squad_points_limit?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["competition_status"]
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          finished_at?: string | null
          id?: string
          name?: string
          rules_version?: Database["public"]["Enums"]["rules_version"]
          squad_points_limit?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["competition_status"]
        }
        Relationships: []
      }
      games: {
        Row: {
          competition_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          is_draw: boolean
          player1_faction: Database["public"]["Enums"]["xwing_faction"] | null
          player1_id: string
          player1_points: number
          player1_squad_id: string | null
          player1_squad_ref: string | null
          player1_squad_text: string
          player2_faction: Database["public"]["Enums"]["xwing_faction"] | null
          player2_id: string
          player2_points: number
          player2_squad_id: string | null
          player2_squad_ref: string | null
          player2_squad_text: string
          reported_by: string
          status: Database["public"]["Enums"]["game_status"]
          winner_id: string | null
        }
        Insert: {
          competition_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          is_draw?: boolean
          player1_faction?: Database["public"]["Enums"]["xwing_faction"] | null
          player1_id: string
          player1_points: number
          player1_squad_id?: string | null
          player1_squad_ref?: string | null
          player1_squad_text?: string
          player2_faction?: Database["public"]["Enums"]["xwing_faction"] | null
          player2_id: string
          player2_points: number
          player2_squad_id?: string | null
          player2_squad_ref?: string | null
          player2_squad_text?: string
          reported_by: string
          status?: Database["public"]["Enums"]["game_status"]
          winner_id?: string | null
        }
        Update: {
          competition_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          is_draw?: boolean
          player1_faction?: Database["public"]["Enums"]["xwing_faction"] | null
          player1_id?: string
          player1_points?: number
          player1_squad_id?: string | null
          player1_squad_ref?: string | null
          player1_squad_text?: string
          player2_faction?: Database["public"]["Enums"]["xwing_faction"] | null
          player2_id?: string
          player2_points?: number
          player2_squad_id?: string | null
          player2_squad_ref?: string | null
          player2_squad_text?: string
          reported_by?: string
          status?: Database["public"]["Enums"]["game_status"]
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_player1_squad_id_fkey"
            columns: ["player1_squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_player2_squad_id_fkey"
            columns: ["player2_squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      package_pilots: {
        Row: {
          created_at: string
          id: string
          package_id: string
          pilot_xws: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          package_id: string
          pilot_xws: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          package_id?: string
          pilot_xws?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "package_pilots_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_pilots_pilot_xws_fkey"
            columns: ["pilot_xws"]
            isOneToOne: false
            referencedRelation: "pilots"
            referencedColumns: ["xws"]
          },
        ]
      }
      package_ships: {
        Row: {
          created_at: string
          id: string
          package_id: string
          quantity: number
          ship_xws: string
        }
        Insert: {
          created_at?: string
          id?: string
          package_id: string
          quantity?: number
          ship_xws: string
        }
        Update: {
          created_at?: string
          id?: string
          package_id?: string
          quantity?: number
          ship_xws?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_ships_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_ships_ship_xws_fkey"
            columns: ["ship_xws"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["xws"]
          },
        ]
      }
      package_upgrades: {
        Row: {
          created_at: string
          id: string
          package_id: string
          quantity: number
          upgrade_xws: string
        }
        Insert: {
          created_at?: string
          id?: string
          package_id: string
          quantity?: number
          upgrade_xws: string
        }
        Update: {
          created_at?: string
          id?: string
          package_id?: string
          quantity?: number
          upgrade_xws?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_upgrades_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_upgrades_upgrade_xws_fkey"
            columns: ["upgrade_xws"]
            isOneToOne: false
            referencedRelation: "upgrades"
            referencedColumns: ["xws"]
          },
        ]
      }
      packages: {
        Row: {
          created_at: string
          id: string
          image: string | null
          name: string
          release_date: string | null
          updated_at: string
          wave: string | null
          xws: string
        }
        Insert: {
          created_at?: string
          id?: string
          image?: string | null
          name: string
          release_date?: string | null
          updated_at?: string
          wave?: string | null
          xws: string
        }
        Update: {
          created_at?: string
          id?: string
          image?: string | null
          name?: string
          release_date?: string | null
          updated_at?: string
          wave?: string | null
          xws?: string
        }
        Relationships: []
      }
      pilots: {
        Row: {
          created_at: string
          faction: string
          id: string
          image: string | null
          legacy_id: number | null
          name: string
          points: number
          ship_xws: string
          skill: number
          slots: string[]
          text: string | null
          unique_pilot: boolean
          updated_at: string
          xws: string
        }
        Insert: {
          created_at?: string
          faction: string
          id?: string
          image?: string | null
          legacy_id?: number | null
          name: string
          points?: number
          ship_xws: string
          skill?: number
          slots?: string[]
          text?: string | null
          unique_pilot?: boolean
          updated_at?: string
          xws: string
        }
        Update: {
          created_at?: string
          faction?: string
          id?: string
          image?: string | null
          legacy_id?: number | null
          name?: string
          points?: number
          ship_xws?: string
          skill?: number
          slots?: string[]
          text?: string | null
          unique_pilot?: boolean
          updated_at?: string
          xws?: string
        }
        Relationships: [
          {
            foreignKeyName: "pilots_ship_xws_fkey"
            columns: ["ship_xws"]
            isOneToOne: false
            referencedRelation: "ships"
            referencedColumns: ["xws"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      ships: {
        Row: {
          actions: string[]
          agility: number | null
          attack: number | null
          created_at: string
          dial: string[]
          dial_image: string | null
          faction: string[]
          firing_arcs: string[]
          hull: number | null
          id: string
          image: string | null
          legacy_id: number | null
          maneuvers: Json | null
          name: string
          shields: number | null
          size: string | null
          updated_at: string
          xws: string
        }
        Insert: {
          actions?: string[]
          agility?: number | null
          attack?: number | null
          created_at?: string
          dial?: string[]
          dial_image?: string | null
          faction?: string[]
          firing_arcs?: string[]
          hull?: number | null
          id?: string
          image?: string | null
          legacy_id?: number | null
          maneuvers?: Json | null
          name: string
          shields?: number | null
          size?: string | null
          updated_at?: string
          xws: string
        }
        Update: {
          actions?: string[]
          agility?: number | null
          attack?: number | null
          created_at?: string
          dial?: string[]
          dial_image?: string | null
          faction?: string[]
          firing_arcs?: string[]
          hull?: number | null
          id?: string
          image?: string | null
          legacy_id?: number | null
          maneuvers?: Json | null
          name?: string
          shields?: number | null
          size?: string | null
          updated_at?: string
          xws?: string
        }
        Relationships: []
      }
      squad_pilot_upgrades: {
        Row: {
          created_at: string
          id: string
          position: number
          squad_pilot_id: string
          upgrade_xws: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          squad_pilot_id: string
          upgrade_xws: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          squad_pilot_id?: string
          upgrade_xws?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_pilot_upgrades_squad_pilot_id_fkey"
            columns: ["squad_pilot_id"]
            isOneToOne: false
            referencedRelation: "squad_pilots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_pilot_upgrades_upgrade_xws_fkey"
            columns: ["upgrade_xws"]
            isOneToOne: false
            referencedRelation: "upgrades"
            referencedColumns: ["xws"]
          },
        ]
      }
      squad_pilots: {
        Row: {
          created_at: string
          id: string
          pilot_xws: string
          position: number
          squad_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pilot_xws: string
          position?: number
          squad_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pilot_xws?: string
          position?: number
          squad_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_pilots_pilot_xws_fkey"
            columns: ["pilot_xws"]
            isOneToOne: false
            referencedRelation: "pilots"
            referencedColumns: ["xws"]
          },
          {
            foreignKeyName: "squad_pilots_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squads: {
        Row: {
          created_at: string
          faction: string
          id: string
          is_public: boolean
          is_snapshot: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          faction: string
          id?: string
          is_public?: boolean
          is_snapshot?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          faction?: string
          id?: string
          is_public?: boolean
          is_snapshot?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      upgrades: {
        Row: {
          attack: number | null
          created_at: string
          faction: string | null
          grants: string[]
          id: string
          image: string | null
          legacy_id: number | null
          name: string
          points: number
          range: string | null
          ship_xws: string | null
          slot: string
          text: string | null
          updated_at: string
          xws: string
        }
        Insert: {
          attack?: number | null
          created_at?: string
          faction?: string | null
          grants?: string[]
          id?: string
          image?: string | null
          legacy_id?: number | null
          name: string
          points?: number
          range?: string | null
          ship_xws?: string | null
          slot: string
          text?: string | null
          updated_at?: string
          xws: string
        }
        Update: {
          attack?: number | null
          created_at?: string
          faction?: string | null
          grants?: string[]
          id?: string
          image?: string | null
          legacy_id?: number | null
          name?: string
          points?: number
          range?: string | null
          ship_xws?: string | null
          slot?: string
          text?: string | null
          updated_at?: string
          xws?: string
        }
        Relationships: []
      }
      user_packages: {
        Row: {
          acquired_at: string | null
          created_at: string
          id: string
          package_id: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          acquired_at?: string | null
          created_at?: string
          id?: string
          package_id: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          acquired_at?: string | null
          created_at?: string
          id?: string
          package_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
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
      user_singles: {
        Row: {
          created_at: string
          id: string
          kind: string
          quantity: number
          updated_at: string
          user_id: string
          xws: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          quantity?: number
          updated_at?: string
          user_id: string
          xws: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          quantity?: number
          updated_at?: string
          user_id?: string
          xws?: string
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
      is_competition_member: {
        Args: { _competition_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "player"
      competition_status: "draft" | "open" | "running" | "finished"
      game_status: "pending" | "confirmed" | "rejected"
      member_status: "pending" | "approved" | "rejected"
      rules_version: "1.0" | "2.0" | "2.5"
      xwing_faction: "imperial" | "rebel" | "scum"
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
      app_role: ["admin", "player"],
      competition_status: ["draft", "open", "running", "finished"],
      game_status: ["pending", "confirmed", "rejected"],
      member_status: ["pending", "approved", "rejected"],
      rules_version: ["1.0", "2.0", "2.5"],
      xwing_faction: ["imperial", "rebel", "scum"],
    },
  },
} as const
