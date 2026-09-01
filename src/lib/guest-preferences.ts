import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const ONBOARDING_COMPLETED_KEY = '@eventime_has_completed_onboarding_v1';
const GUEST_PREFERENCES_KEY = '@eventime_guest_preferences_v1';

export interface OnboardingData {
  userType: 'student' | 'professional' | 'creator';
  fullName?: string;
  college?: string;
  collegeId?: string | null;
  branch?: string;
  graduationYear?: string;
  industryFocus?: string;
  preferredCities: string[];
  goals: string[];
}

/**
 * Checks if the user has completed the onboarding flow on this device.
 */
export async function getHasCompletedOnboarding(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Marks onboarding as completed locally.
 */
export async function setHasCompletedOnboarding(completed: boolean = true): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, completed ? 'true' : 'false');
  } catch (err) {
    console.error('[GuestPreferences] Error setting onboarding completion:', err);
  }
}

/**
 * Saves temporary guest preferences to local storage.
 */
export async function saveGuestPreferences(data: Partial<OnboardingData>): Promise<void> {
  try {
    const existing = await getGuestPreferences();
    const merged = { ...existing, ...data };
    await AsyncStorage.setItem(GUEST_PREFERENCES_KEY, JSON.stringify(merged));
  } catch (err) {
    console.error('[GuestPreferences] Error saving guest preferences:', err);
  }
}

/**
 * Retrieves guest preferences from local storage.
 */
export async function getGuestPreferences(): Promise<OnboardingData> {
  try {
    const raw = await AsyncStorage.getItem(GUEST_PREFERENCES_KEY);
    if (!raw) {
      return {
        userType: 'student',
        preferredCities: [],
        goals: [],
      };
    }
    return JSON.parse(raw);
  } catch {
    return {
      userType: 'student',
      preferredCities: [],
      goals: [],
    };
  }
}

/**
 * Syncs saved onboarding preferences into a user's Supabase profile upon sign in.
 */
export async function syncPreferencesToSupabase(
  userId: string,
  data: OnboardingData
): Promise<boolean> {
  try {
    const cleanUsername = data.fullName
      ? data.fullName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15)
      : undefined;

    const payload: any = {
      user_type: data.userType === 'student' ? 'student' : 'professional',
      preferred_cities: data.preferredCities.slice(0, 3),
      goals: data.goals.slice(0, 6),
      is_onboarded: true,
      updated_at: new Date().toISOString(),
    };

    if (data.fullName) payload.full_name = data.fullName;
    if (data.userType === 'student') {
      if (data.college) payload.college = data.college;
      if (data.collegeId) payload.college_id = data.collegeId;
      if (data.branch) payload.branch = data.branch;
      if (data.graduationYear) payload.graduation_year = data.graduationYear;
    }

    const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
    if (error) {
      console.error('[GuestPreferences] Sync to Supabase error:', error);
      return false;
    }

    await setHasCompletedOnboarding(true);
    return true;
  } catch (err) {
    console.error('[GuestPreferences] Unexpected sync error:', err);
    return false;
  }
}
