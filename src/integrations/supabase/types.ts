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
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_last4: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          scopes: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_last4: string
          key_prefix?: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          scopes?: string[]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_last4?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          scopes?: string[]
          user_id?: string
        }
        Relationships: []
      }
      api_usage: {
        Row: {
          api_key_id: string | null
          created_at: string
          endpoint: string
          id: number
          latency_ms: number
          status_code: number
          user_id: string
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          endpoint: string
          id?: number
          latency_ms: number
          status_code: number
          user_id: string
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          endpoint?: string
          id?: number
          latency_ms?: number
          status_code?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_slippage_bps: number
          display_name: string | null
          id: string
          preferred_chain: string
          theme: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_slippage_bps?: number
          display_name?: string | null
          id: string
          preferred_chain?: string
          theme?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_slippage_bps?: number
          display_name?: string | null
          id?: string
          preferred_chain?: string
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      route_schedules: {
        Row: {
          cadence: string
          created_at: string
          enabled: boolean
          id: string
          interval_minutes: number | null
          last_run_at: string | null
          next_run_at: string | null
          route_id: string
          run_at_utc: string | null
          threshold_operator: string
          threshold_value: number | null
          updated_at: string
          user_id: string
          weekday: number | null
        }
        Insert: {
          cadence?: string
          created_at?: string
          enabled?: boolean
          id?: string
          interval_minutes?: number | null
          last_run_at?: string | null
          next_run_at?: string | null
          route_id: string
          run_at_utc?: string | null
          threshold_operator?: string
          threshold_value?: number | null
          updated_at?: string
          user_id: string
          weekday?: number | null
        }
        Update: {
          cadence?: string
          created_at?: string
          enabled?: boolean
          id?: string
          interval_minutes?: number | null
          last_run_at?: string | null
          next_run_at?: string | null
          route_id?: string
          run_at_utc?: string | null
          threshold_operator?: string
          threshold_value?: number | null
          updated_at?: string
          user_id?: string
          weekday?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "route_schedules_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "saved_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_routes: {
        Row: {
          amount: number | null
          created_at: string
          from_chain: string
          from_token: string
          id: string
          label: string
          slippage_bps: number
          to_chain: string
          to_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          from_chain?: string
          from_token: string
          id?: string
          label: string
          slippage_bps?: number
          to_chain?: string
          to_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          from_chain?: string
          from_token?: string
          id?: string
          label?: string
          slippage_bps?: number
          to_chain?: string
          to_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      schedule_runs: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          outcome: string
          rate: number | null
          route_id: string | null
          schedule_id: string | null
          swap_id: string | null
          threshold_operator: string | null
          threshold_value: number | null
          trigger: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          outcome: string
          rate?: number | null
          route_id?: string | null
          schedule_id?: string | null
          swap_id?: string | null
          threshold_operator?: string | null
          threshold_value?: number | null
          trigger?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          outcome?: string
          rate?: number | null
          route_id?: string | null
          schedule_id?: string | null
          swap_id?: string | null
          threshold_operator?: string | null
          threshold_value?: number | null
          trigger?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_runs_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "saved_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_runs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "route_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_runs_swap_id_fkey"
            columns: ["swap_id"]
            isOneToOne: false
            referencedRelation: "swaps"
            referencedColumns: ["id"]
          },
        ]
      }
      swaps: {
        Row: {
          amount_in: number
          amount_out: number | null
          confirmed_at: string | null
          created_at: string
          error_message: string | null
          explorer_url: string | null
          from_chain: string
          from_token: string
          gas_estimate_usd: number | null
          id: string
          min_received: number | null
          price_impact_bps: number | null
          quote_id: string | null
          rate: number | null
          route_id: string | null
          route_legs: Json | null
          slippage_bps: number
          source: string
          status: string
          to_chain: string
          to_token: string
          tx_hash: string | null
          updated_at: string
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          amount_in: number
          amount_out?: number | null
          confirmed_at?: string | null
          created_at?: string
          error_message?: string | null
          explorer_url?: string | null
          from_chain: string
          from_token: string
          gas_estimate_usd?: number | null
          id?: string
          min_received?: number | null
          price_impact_bps?: number | null
          quote_id?: string | null
          rate?: number | null
          route_id?: string | null
          route_legs?: Json | null
          slippage_bps: number
          source?: string
          status?: string
          to_chain: string
          to_token: string
          tx_hash?: string | null
          updated_at?: string
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          amount_in?: number
          amount_out?: number | null
          confirmed_at?: string | null
          created_at?: string
          error_message?: string | null
          explorer_url?: string | null
          from_chain?: string
          from_token?: string
          gas_estimate_usd?: number | null
          id?: string
          min_received?: number | null
          price_impact_bps?: number | null
          quote_id?: string | null
          rate?: number | null
          route_id?: string | null
          route_legs?: Json | null
          slippage_bps?: number
          source?: string
          status?: string
          to_chain?: string
          to_token?: string
          tx_hash?: string | null
          updated_at?: string
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "swaps_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "saved_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_wallets: {
        Row: {
          address: string
          chain: string
          created_at: string
          id: string
          label: string | null
          user_id: string
        }
        Insert: {
          address: string
          chain?: string
          created_at?: string
          id?: string
          label?: string | null
          user_id: string
        }
        Update: {
          address?: string
          chain?: string
          created_at?: string
          id?: string
          label?: string | null
          user_id?: string
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          attempt: number
          created_at: string
          delivered_at: string | null
          error_message: string | null
          event: string
          id: number
          payload: Json
          response_body: string | null
          status_code: number | null
          user_id: string
          webhook_id: string
        }
        Insert: {
          attempt?: number
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          event: string
          id?: number
          payload: Json
          response_body?: string | null
          status_code?: number | null
          user_id: string
          webhook_id: string
        }
        Update: {
          attempt?: number
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          event?: string
          id?: number
          payload?: Json
          response_body?: string | null
          status_code?: number | null
          user_id?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          events: string[]
          id: string
          secret: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          events?: string[]
          id?: string
          secret: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          events?: string[]
          id?: string
          secret?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
