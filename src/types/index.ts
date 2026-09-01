import type { Database } from './database';
import type { User } from '@supabase/supabase-js';

// Table Row aliases
export type EventRow = Database['public']['Tables']['events']['Row'];
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type ReportRow = Database['public']['Tables']['event_reports']['Row'];
export type SavedEventRow = Database['public']['Tables']['saved_events']['Row'];
export type InterestedEventRow = Database['public']['Tables']['interested_events']['Row'];
export type CollegeRow = Database['public']['Tables']['colleges']['Row'];
export type VerifiedDomainRow = Database['public']['Tables']['verified_domains']['Row'];
export type AppSettingsRow = Database['public']['Tables']['app_settings']['Row'];
export type LeaderboardViewRow = Database['public']['Views']['leaderboard_view']['Row'];

// Auth User
export type AuthUser = User;

// Navigation Param Lists
export type RootStackParamList = {
  MainTabs: undefined;
  Login: undefined;
  Onboarding: undefined;
  EventDetail: { slug: string; id?: string };
  CreateEvent: { editId?: string };
  SavedEvents: undefined;
  MyPostedEvents: undefined;
  Leaderboard: undefined;
  Admin: undefined;
  Settings: undefined;
  CityEvents: { city: string };
  CategoryEvents: { category: string };
};

export type MainTabParamList = {
  HomeTab: undefined;
  SearchTab: undefined;
  CreateTab: undefined;
  CitiesTab: undefined;
  ProfileTab: undefined;
};