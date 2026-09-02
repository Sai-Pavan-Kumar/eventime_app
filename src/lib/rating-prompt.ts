import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
import { supabase } from './supabase';

const INSTALL_DATE_KEY = '@eventime_install_date';
const RATING_STATUS_KEY = '@eventime_rating_status';
const LAST_PROMPTED_KEY = '@eventime_last_prompted_at';

export type RatingStatus = 'unrated' | 'rated_store' | 'rated_internal' | 'snoozed';

const DAYS_BEFORE_FIRST_PROMPT = 5;
const DAYS_BEFORE_SNOOZE_RETRY = 7;

// Initialize or get the installation date
export async function initializeInstallTracking(): Promise<number> {
  try {
    const existing = await AsyncStorage.getItem(INSTALL_DATE_KEY);
    if (existing) {
      return parseInt(existing, 10);
    }
    const now = Date.now();
    await AsyncStorage.setItem(INSTALL_DATE_KEY, now.toString());
    return now;
  } catch (err) {
    console.warn('[RatingPrompt] Error getting install date:', err);
    return Date.now();
  }
}

// Check if rating modal should appear
export async function shouldShowRatingPrompt(): Promise<boolean> {
  try {
    const status = (await AsyncStorage.getItem(RATING_STATUS_KEY)) as RatingStatus | null;
    
    // If already rated on store or sent internal review, never ask again
    if (status === 'rated_store' || status === 'rated_internal') {
      return false;
    }

    const installDateStr = await AsyncStorage.getItem(INSTALL_DATE_KEY);
    const installDate = installDateStr ? parseInt(installDateStr, 10) : await initializeInstallTracking();
    const now = Date.now();

    const daysSinceInstall = (now - installDate) / (1000 * 60 * 60 * 24);

    // Must be installed for at least 5 days
    if (daysSinceInstall < DAYS_BEFORE_FIRST_PROMPT) {
      return false;
    }

    // If snoozed, check if 7 days have passed since last prompt
    if (status === 'snoozed') {
      const lastPromptedStr = await AsyncStorage.getItem(LAST_PROMPTED_KEY);
      if (lastPromptedStr) {
        const lastPrompted = parseInt(lastPromptedStr, 10);
        const daysSinceLastPrompt = (now - lastPrompted) / (1000 * 60 * 60 * 24);
        if (daysSinceLastPrompt < DAYS_BEFORE_SNOOZE_RETRY) {
          return false;
        }
      }
    }

    return true;
  } catch (err) {
    console.warn('[RatingPrompt] Check error:', err);
    return false;
  }
}

// Record user action
export async function recordRatingAction(
  action: RatingStatus,
  stars?: number,
  feedbackText?: string,
  categoryTag?: string,
  userId?: string | null
): Promise<void> {
  try {
    const now = Date.now();
    await AsyncStorage.setItem(RATING_STATUS_KEY, action);
    await AsyncStorage.setItem(LAST_PROMPTED_KEY, now.toString());

    // If internal feedback was submitted (1-3 stars), save to Supabase platform_feedback
    if (action === 'rated_internal' && (feedbackText || stars)) {
      const fullMessage = `[${stars || 0} Stars Review] ${categoryTag ? `[Topic: ${categoryTag}] ` : ''}${feedbackText || 'No comment provided'}`;
      await supabase.from('platform_feedback').insert({
        user_id: userId || null,
        type: 'rating_review',
        message: fullMessage,
        status: 'pending',
      });
    }
  } catch (err) {
    console.warn('[RatingPrompt] Record error:', err);
  }
}

// Open Google Play Store listing directly
export async function openStoreListing(): Promise<void> {
  const packageName = 'com.eventime.app';
  const marketUrl = `market://details?id=${packageName}`;
  const webUrl = `https://play.google.com/store/apps/details?id=${packageName}`;

  try {
    const canOpen = await Linking.canOpenURL(marketUrl);
    if (canOpen) {
      await Linking.openURL(marketUrl);
    } else {
      await Linking.openURL(webUrl);
    }
  } catch {
    await Linking.openURL(webUrl);
  }
}
