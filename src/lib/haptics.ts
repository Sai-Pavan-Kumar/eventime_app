import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Universal safe haptic feedback manager for EvenTime mobile.
 * Silently catches errors on devices or web without haptic motors.
 */
export const haptic = {
  /** Light tactile tick for tabs, filter chips, segmented controls, city priority selections */
  light: () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Non-blocking fallback
    }
  },

  /** Medium punch for bookmarking, saving events, primary action buttons */
  medium: () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  },

  /** Micro-tick for picker wheel changes, modal selections */
  selection: () => {
    try {
      Haptics.selectionAsync();
    } catch {}
  },

  /** Positive dual-pulse for successful submissions (e.g., event posted, profile updated) */
  success: () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  },

  /** Alert buzz for validation errors or deletion confirmations */
  error: () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {}
  },
};
