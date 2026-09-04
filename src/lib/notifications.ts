import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { parseEventDateString, formatEventTime } from './utils/date';

const PUSH_TOKEN_KEY = '@eventime_push_token';
const NOTIF_PREFS_KEY = '@eventime_notif_prefs';

export interface NotificationPreferences {
  event_reminders: boolean;
  campus_alerts: boolean;
  city_updates: boolean;
  weekly_digest: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  event_reminders: true,
  campus_alerts: true,
  city_updates: true,
  weekly_digest: false,
};

// 1. Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

// 2. Set up Android notification channels
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C47FF',
    });

    await Notifications.setNotificationChannelAsync('events-reminders', {
      name: 'Event Reminders',
      description: 'Reminders for your upcoming saved and registered events',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C47FF',
    });

    await Notifications.setNotificationChannelAsync('campus-alerts', {
      name: 'Campus Alerts',
      description: 'Exclusive events and announcements from your college',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 300, 200, 300],
      lightColor: '#3B82F6',
    });

    await Notifications.setNotificationChannelAsync('city-updates', {
      name: 'City Events',
      description: 'New events trending in your preferred cities',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      vibrationPattern: [0, 200, 200, 200],
      lightColor: '#10B981',
    });
  }
}

// 3. Register for Push Notifications & retrieve token
export async function registerForPushNotificationsAsync(userId?: string): Promise<string | null> {
  try {
    await setupNotificationChannels();

    if (!Device.isDevice) {
      console.log('[Notifications] Physical device required for remote push tokens.');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission not granted for push notifications');
      return null;
    }

    // Get Expo push token
    let token: string | null = null;
    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId ??
        'ee58b4c0-0130-417f-878e-59163a4ddc4c';

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      token = tokenData.data;
    } catch (tokenErr) {
      console.warn('[Notifications] Could not get Expo push token:', tokenErr);
    }

    if (token) {
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    }

    // Resilience: use newly retrieved token or fallback to cached token in storage
    const effectiveToken = token || (await AsyncStorage.getItem(PUSH_TOKEN_KEY));

    // If user is authenticated, sync token with Supabase profile
    if (effectiveToken && userId) {
      try {
        await supabase
          .from('profiles')
          .update({ push_token: effectiveToken } as any)
          .eq('id', userId);
      } catch (dbErr) {
        console.warn('[Notifications] Error syncing push token to profile:', dbErr);
      }
    }

    return effectiveToken;
  } catch (error) {
    console.error('[Notifications] Failed to register for push notifications:', error);
    return null;
  }
}

// 4. Token Refresh Listener
export function setupPushTokenRefreshListener(userId?: string) {
  return Notifications.addPushTokenListener(async (tokenData) => {
    const token = tokenData.data;
    if (token) {
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
      if (userId) {
        try {
          await supabase
            .from('profiles')
            .update({ push_token: token } as any)
            .eq('id', userId);
        } catch (err) {
          console.warn('[Notifications] Failed to update refreshed push token:', err);
        }
      }
    }
  });
}

// 5. Get Saved or Active Push Token
export async function getCachedPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}

// 6. Notification Preferences Management
export async function getNotificationPreferences(userId?: string): Promise<NotificationPreferences> {
  try {
    // 1. Try local storage first
    const local = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
    let prefs: NotificationPreferences = local ? JSON.parse(local) : DEFAULT_NOTIFICATION_PREFERENCES;

    // 2. If logged in, sync with Supabase profile
    if (userId) {
      const { data } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', userId)
        .maybeSingle();

      if (data && (data as any).notification_preferences) {
        prefs = { ...prefs, ...(data as any).notification_preferences };
        await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));
      }
    }

    return prefs;
  } catch (err) {
    console.warn('[Notifications] Error fetching notification preferences:', err);
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export async function saveNotificationPreferences(
  preferences: NotificationPreferences,
  userId?: string
): Promise<boolean> {
  try {
    await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(preferences));

    if (userId) {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: preferences } as any)
        .eq('id', userId);

      if (error) {
        console.warn('[Notifications] Supabase preferences update error:', error);
      }
    }

    return true;
  } catch (err) {
    console.error('[Notifications] Error saving notification preferences:', err);
    return false;
  }
}

// 7. Universal Notification Navigation Handler (Deep Linking)
export function handleNotificationResponse(navigation: any, response: Notifications.NotificationResponse) {
  try {
    const data = response.notification.request.content.data;
    if (!data) return;

    const eventId = data.eventId || data.id;
    if (eventId) {
      navigation.navigate('EventDetail', { eventId, id: eventId });
    } else if (data.city) {
      navigation.navigate('CityEvents', { city: data.city });
    } else if (data.screen) {
      navigation.navigate(data.screen, data.params || {});
    }
  } catch (err) {
    console.warn('[Notifications] Error handling notification navigation:', err);
  }
}

// 8. Cold-Start Notification Check (When app opened directly from killed state via notification tap)
export async function checkColdStartNotification(navigation: any) {
  try {
    const lastResponse = await Notifications.getLastNotificationResponseAsync();
    if (lastResponse) {
      handleNotificationResponse(navigation, lastResponse);
    }
  } catch (err) {
    console.warn('[Notifications] Error checking cold start notification:', err);
  }
}

// 9. Schedule a local reminder for an event (e.g. 24h before event starts)
export async function scheduleEventReminder(event: {
  id: string;
  title: string;
  date_string: string;
  start_time?: string | null;
  location?: string | null;
}): Promise<string | null> {
  try {
    const prefs = await getNotificationPreferences();
    if (prefs.event_reminders === false) {
      return null;
    }

    const eventDate = parseEventDateString(event.date_string);
    if (!eventDate || isNaN(eventDate.getTime())) return null;

    // Try to parse time from start_time or composite date_string
    let timeStr = event.start_time;
    if (!timeStr && (event.date_string.includes('·') || event.date_string.includes('•'))) {
      const parts = event.date_string.split(/[·•]/);
      if (parts.length > 1 && parts[1].trim()) {
        timeStr = parts[1].trim();
      }
    }

    if (timeStr) {
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (match) {
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const meridian = match[3]?.toUpperCase();
        if (meridian === 'PM' && hours < 12) hours += 12;
        if (meridian === 'AM' && hours === 12) hours = 0;
        eventDate.setHours(hours, minutes, 0, 0);
      }
    }

    const now = new Date();
    if (eventDate.getTime() <= now.getTime()) {
      return null; // Event has already passed
    }

    // Schedule 24 hours before the event date (at 9:00 AM)
    const reminderTime = new Date(eventDate);
    reminderTime.setDate(reminderTime.getDate() - 1);
    reminderTime.setHours(9, 0, 0, 0);

    let triggerTime: Date;
    let reminderTitle: string;
    let reminderBody: string;

    const formattedTime = formatEventTime(event.date_string, event.start_time);
    const timeSnippet = formattedTime && formattedTime !== 'All Day' ? ` · ${formattedTime}` : '';

    if (reminderTime.getTime() > now.getTime()) {
      triggerTime = reminderTime;
      reminderTitle = `Tomorrow${timeSnippet}`;
      reminderBody = `"${event.title}" begins tomorrow${event.location ? ` at ${event.location}` : ''}.`;
    } else {
      // Event is within 24 hours
      const oneHourBefore = new Date(eventDate.getTime() - 60 * 60 * 1000);
      if (oneHourBefore.getTime() > now.getTime()) {
        triggerTime = oneHourBefore;
        reminderTitle = 'Starting in 1 hour';
        reminderBody = `"${event.title}" begins shortly${event.location ? ` at ${event.location}` : ''}.`;
      } else {
        const msUntilEvent = eventDate.getTime() - now.getTime();
        if (msUntilEvent > 15 * 60 * 1000) {
          triggerTime = new Date(now.getTime() + 5 * 60 * 1000);
          reminderTitle = `Today${timeSnippet}`;
          reminderBody = `"${event.title}" is scheduled for today${event.location ? ` at ${event.location}` : ''}.`;
        } else {
          return null; // Starting in under 15 mins or in the past
        }
      }
    }

    // Avoid duplicate reminders for the same event
    await cancelEventReminder(event.id);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: reminderTitle,
        body: reminderBody,
        data: { eventId: event.id, id: event.id },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerTime,
        channelId: 'events-reminders',
      },
    });

    return notificationId;
  } catch (err) {
    console.warn('[Notifications] Error scheduling local reminder:', err);
    return null;
  }
}

// 10. Cancel all scheduled notifications for a specific event
export async function cancelEventReminder(eventId: string): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      const data = notif.content.data;
      if (data?.eventId === eventId || data?.id === eventId) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
  } catch (err) {
    console.warn('[Notifications] Error cancelling reminder for event:', err);
  }
}

// 11. Cancel a scheduled notification by notification ID
export async function cancelScheduledReminder(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (err) {
    console.warn('[Notifications] Error cancelling reminder:', err);
  }
}

// 12. Remote Push Notification Dispatcher (Invokes Supabase Edge Function)
export interface SendPushNotificationParams {
  userIds?: string[];
  city?: string;
  category?: string;
  college?: string;
  notificationType?: 'event_reminders' | 'campus_alerts' | 'city_updates' | 'weekly_digest';
  title: string;
  body: string;
  data?: Record<string, any>;
  channelId?: string;
}

export async function sendRemotePushNotification(params: SendPushNotificationParams): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_ids: params.userIds,
        city: params.city,
        category: params.category,
        college: params.college,
        notification_type: params.notificationType || 'event_reminders',
        title: params.title,
        body: params.body,
        data: params.data || {},
        channel_id: params.channelId || 'default',
      },
    });

    if (error) {
      console.warn('[Notifications] Remote push notification error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[Notifications] Failed to invoke send-push-notification:', err);
    return false;
  }
}

