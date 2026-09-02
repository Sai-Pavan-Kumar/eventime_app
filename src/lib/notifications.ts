import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const PUSH_TOKEN_KEY = '@eventime_push_token';

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
  }
}

// 3. Register for Push Notifications & retrieve token
export async function registerForPushNotificationsAsync(userId?: string): Promise<string | null> {
  try {
    await setupNotificationChannels();

    if (!Device.isDevice) {
      console.log('[Notifications] Must use physical device for Push Notifications');
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
      const tokenData = await Notifications.getExpoPushTokenAsync();
      token = tokenData.data;
    } catch (tokenErr) {
      console.warn('[Notifications] Could not get Expo push token:', tokenErr);
    }

    if (token) {
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

      // If user is authenticated, sync token with Supabase profile
      if (userId) {
        try {
          await supabase
            .from('profiles')
            .update({ push_token: token } as any)
            .eq('id', userId);
        } catch (dbErr) {
          console.warn('[Notifications] Error syncing push token to profile:', dbErr);
        }
      }
    }

    return token;
  } catch (error) {
    console.error('[Notifications] Failed to register for push notifications:', error);
    return null;
  }
}

// 4. Schedule a local reminder for an event (e.g. 24h before event starts)
export async function scheduleEventReminder(event: {
  id: string;
  title: string;
  date_string: string;
  start_time?: string | null;
  location?: string | null;
}): Promise<string | null> {
  try {
    const eventDate = new Date(event.date_string);
    if (isNaN(eventDate.getTime())) return null;

    // Schedule 24 hours before the event date (at 9:00 AM)
    const reminderTime = new Date(eventDate);
    reminderTime.setDate(reminderTime.getDate() - 1);
    reminderTime.setHours(9, 0, 0, 0);

    const now = new Date();
    // If 24h before is already in the past, schedule for 1 hour from now if event is in the future
    let triggerTime: Date = reminderTime;
    if (reminderTime.getTime() <= now.getTime()) {
      if (eventDate.getTime() > now.getTime()) {
        triggerTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      } else {
        return null; // Event has already passed
      }
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Upcoming Event: ${event.title}`,
        body: `Happening tomorrow${event.location ? ` at ${event.location}` : ''}! Don't miss out.`,
        data: { eventId: event.id },
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

// 5. Cancel a scheduled notification
export async function cancelScheduledReminder(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (err) {
    console.warn('[Notifications] Error cancelling reminder:', err);
  }
}
