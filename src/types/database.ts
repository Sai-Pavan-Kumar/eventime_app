export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
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
        Relationships: []
      }
      events: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          banner_url: string | null
          branch_tags: string[] | null
          category: string
          city: string | null
          college_branch: string | null
          college_id: string | null
          college_only: boolean | null
          college_year: string | null
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
          admin_notes?: string | null
          approved_at?: string | null
          banner_url?: string | null
          branch_tags?: string[] | null
          category: string
          city?: string | null
          college_branch?: string | null
          college_id?: string | null
          college_only?: boolean | null
          college_year?: string | null
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
          admin_notes?: string | null
          approved_at?: string | null
          banner_url?: string | null
          branch_tags?: string[] | null
          category?: string
          city?: string | null
          college_branch?: string | null
          college_id?: string | null
          college_only?: boolean | null
          college_year?: string | null
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
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          branch: string | null
          college: string | null
          college_id: string | null
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
          updated_at: string | null
          user_type: string | null
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
        Relationships: []
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
        Relationships: []
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
      app_settings: {
        Row: {
          featured_enabled: boolean
          id: number
          leaderboard_enabled: boolean
        }
        Insert: {
          featured_enabled?: boolean
          id?: number
          leaderboard_enabled?: boolean
        }
        Update: {
          featured_enabled?: boolean
          id?: number
          leaderboard_enabled?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard_view: {
        Row: {
          avatar_url: string | null
          college: string | null
          et_score: number | null
          full_name: string | null
          rank: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
