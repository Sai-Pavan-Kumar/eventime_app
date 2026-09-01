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
       rate_limits: {
        Row: {
          ip_address: string
          endpoint: string
          request_count: number
          reset_at: string
        }
        Insert: {
          ip_address: string
          endpoint: string
          request_count?: number
          reset_at: string
        }
        Update: {
          ip_address?: string
          endpoint?: string
          request_count?: number
          reset_at?: string
        }
        Relationships: []
      }
      colleges: {
        Row: {
          id: string
          logo_url: string | null
          name: string
          slug: string | null
          state: string | null
          theme_color: string | null
          website: string | null
        }
        Insert: {
          id?: string
          logo_url?: string | null
          name: string
          slug?: string | null
          state?: string | null
          theme_color?: string | null
          website?: string | null
        }
        Update: {
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string | null
          state?: string | null
          theme_color?: string | null
          website?: string | null
        }
        Relationships: []
      }
      event_reports: {
        Row: {
          created_at: string
          curator_id: string | null
          event_id: string | null
          id: string
          reason: string
          reporter_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          curator_id?: string | null
          event_id?: string | null
          id?: string
          reason: string
          reporter_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          curator_id?: string | null
          event_id?: string | null
          id?: string
          reason?: string
          reporter_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_reports_curator_id_fkey"
            columns: ["curator_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "event_reports_curator_id_fkey"
            columns: ["curator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_reports_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "event_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          college_branch: string | null
          college_year: string | null
          college_only: boolean | null
          banner_url: string | null
          branch_tags: string[] | null
          category: string
          city: string | null
          college_id: string | null
          created_at: string | null
          creator_id: string | null
          date_string: string
          description: string | null
          end_date_string: string | null
          end_time: string | null
          external_link: string | null
          goal_tags: string[] | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          is_free: boolean | null
          is_virtual: boolean | null
          lat: number | null
          location: string | null
          lon: number | null
          organizer_name: string
          poster_url: string | null
          price: number | null
          prizes: string | null
          registration_deadline: string | null
          registration_link: string | null
          slug: string | null
          start_time: string | null
          status: string | null
          target_audience: string[] | null
          team_size: string | null
          title: string
          website: string | null
        }
        Insert: {
          college_branch?: string | null
          college_year?: string | null
          college_only?: boolean | null
          admin_notes?: string | null
          approved_at?: string | null
          banner_url?: string | null
          branch_tags?: string[] | null
          category: string
          city?: string | null
          college_id?: string | null
          created_at?: string | null
          creator_id?: string | null
          date_string: string
          description?: string | null
          end_date_string?: string | null
          end_time?: string | null
          external_link?: string | null
          goal_tags?: string[] | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_free?: boolean | null
          is_virtual?: boolean | null
          lat?: number | null
          location?: string | null
          lon?: number | null
          organizer_name: string
          poster_url?: string | null
          price?: number | null
          prizes?: string | null
          registration_deadline?: string | null
          registration_link?: string | null
          slug?: string | null
          start_time?: string | null
          status?: string | null
          target_audience?: string[] | null
          team_size?: string | null
          title: string
          website?: string | null
        }
        Update: {
          college_branch?: string | null
          college_year?: string | null
          college_only?: boolean | null
          admin_notes?: string | null
          approved_at?: string | null
          banner_url?: string | null
          branch_tags?: string[] | null
          category?: string
          city?: string | null
          college_id?: string | null
          created_at?: string | null
          creator_id?: string | null
          date_string?: string
          description?: string | null
          end_date_string?: string | null
          end_time?: string | null
          external_link?: string | null
          goal_tags?: string[] | null
          id?: string
          image_url?: string | null

          is_featured?: boolean | null
          is_free?: boolean | null
          is_virtual?: boolean | null
          lat?: number | null
          location?: string | null
          lon?: number | null
          organizer_name?: string
          poster_url?: string | null
          price?: number | null
          prizes?: string | null
          registration_deadline?: string | null
          registration_link?: string | null
          slug?: string | null
          start_time?: string | null
          status?: string | null
          target_audience?: string[] | null
          team_size?: string | null
          title?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      followers: {
        Row: {
          created_at: string
          curator_id: string | null
          follower_id: string | null
          id: string
        }
        Insert: {
          created_at?: string
          curator_id?: string | null
          follower_id?: string | null
          id?: string
        }
        Update: {
          created_at?: string
          curator_id?: string | null
          follower_id?: string | null
          id?: string
        }
        Relationships: []
      }
      interested_events: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interested_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }

        app_settings: {
          Row: { id: number; leaderboard_enabled: boolean; featured_enabled: boolean }
          Insert: { id?: number; leaderboard_enabled?: boolean; featured_enabled?: boolean }
          Update: { id?: number; leaderboard_enabled?: boolean; featured_enabled?: boolean }
          Relationships: []
        }
      platform_feedback: {
        Row: {
          created_at: string
          id: string
          message: string
          status: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          status?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          status?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          college: string | null
          college_id: string | null
          branch: string | null
          deleted_at: string | null
          elo_rating: number | null
          email: string | null
          et_score: number | null
          full_name: string | null
          goals: string[] | null
          graduation_year: string | null
          id: string
          is_onboarded: boolean | null
          penalty_points: number | null
          preferred_cities: string[] | null
          role: string | null
          user_type: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          branch?: string | null
          college?: string | null
          college_id?: string | null
          deleted_at?: string | null
          elo_rating?: number | null
          email?: string | null
          et_score?: number | null
          full_name?: string | null
          goals?: string[] | null
          graduation_year?: string | null
          id: string
          is_onboarded?: boolean | null
          penalty_points?: number | null
          preferred_cities?: string[] | null
          role?: string | null
          updated_at?: string | null
          user_type?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          branch?: string | null
          college?: string | null
          college_id?: string | null
          deleted_at?: string | null
          elo_rating?: number | null
          email?: string | null
          et_score?: number | null
          full_name?: string | null
          goals?: string[] | null
          graduation_year?: string | null
          id?: string
          is_onboarded?: boolean | null
          penalty_points?: number | null
          preferred_cities?: string[] | null
          role?: string | null
          updated_at?: string | null
          user_type?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_events: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      verified_domains: {
        Row: {
          created_at: string | null
          domain_name: string
          id: string
        }
        Insert: {
          created_at?: string | null
          domain_name: string
          id?: string
        }
        Update: {
          created_at?: string | null
          domain_name?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard_view: {
        Row: {
          avatar_url: string | null
          base_score: number | null
          college: string | null
          et_score: number | null
          events_posted: number | null
          full_name: string | null
          impact_saves: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_leaderboard_penalty: {
        Args: { p_user_id: string; p_amount: number }
        Returns: undefined
      }
      search_colleges: {
        Args: { search_term: string }
        Returns: { id: string; name: string; slug: string | null; state: string | null; theme_color: string | null; website: string | null; logo_url: string | null }[]
      }
      delete_old_trashed_events: { Args: never; Returns: undefined }
      increment_et_score: {
        Args: { delta: number; user_id: string }
        Returns: undefined
      }
      award_event_approval_score: {
        Args: { p_user_id: string; p_event_id: string }
        Returns: undefined
      }
      get_platform_stats: {
          Args: Record<PropertyKey, never>
          Returns: { event_count: number; city_count: number; category_count: number; user_count: number }
        }
      delete_user: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
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