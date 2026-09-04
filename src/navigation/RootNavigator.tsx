import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import { useAuth } from '../context/AuthContext';
import {
  registerForPushNotificationsAsync,
  handleNotificationResponse,
  checkColdStartNotification,
  setupPushTokenRefreshListener,
} from '../lib/notifications';
import { MainTabNavigator } from './MainTabNavigator';
import LoginScreen from '../screens/LoginScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import CreateEventScreen from '../screens/CreateEventScreen';
import SavedEventsScreen from '../screens/SavedEventsScreen';
import MyPostedEventsScreen from '../screens/MyPostedEventsScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import AdminScreen from '../screens/AdminScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CityEventsScreen from '../screens/CityEventsScreen';
import CuratorProfileScreen from '../screens/CuratorProfileScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import TermsScreen from '../screens/TermsScreen';
import { theme } from '../config/theme';
import { APP_ASSETS } from '../lib/asset-registry';
import { getHasCompletedOnboarding } from '../lib/guest-preferences';
import type { RootStackParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Universal Links & Deep Linking Configuration
const linking = {
  prefixes: [
    Linking.createURL('/'),
    'eventime://',
    'https://eventime.thesurfboard.in',
    'https://www.eventime.thesurfboard.in',
    'https://eventime.in',
    'https://www.eventime.in',
  ],
  config: {
    screens: {
      MainTabs: '',
      Login: 'auth',
      EventDetail: 'events/:slug',
      CityEvents: 'cities/:city',
      CuratorProfile: 'curator/:username',
      Leaderboard: 'leaderboard',
      CreateEvent: 'create',
    },
  },
};

export function RootNavigator() {
  const { user, profile, isLoading, isOnboarded } = useAuth();
  const [hasCompletedLocalOnboarding, setHasCompletedLocalOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    getHasCompletedOnboarding().then((completed) => {
      setHasCompletedLocalOnboarding(completed);
    });
  }, []);

  // Register for push notifications, refresh listener, and listen for responses/deep-links
  useEffect(() => {
    let responseSub: Notifications.Subscription | null = null;
    let tokenRefreshSub: Notifications.Subscription | null = null;
    let timer: NodeJS.Timeout | null = null;

    try {
      registerForPushNotificationsAsync(user?.id);
      tokenRefreshSub = setupPushTokenRefreshListener(user?.id);

      // 1. Listen for notification taps when app is in foreground or background
      responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
        try {
          if (navigationRef.isReady()) {
            handleNotificationResponse(navigationRef, response);
          }
        } catch (err) {
          console.warn('[RootNavigator] Notification response handler error:', err);
        }
      });

      // 2. Check if app was launched directly from a notification tap (Cold start)
      if (navigationRef.isReady()) {
        checkColdStartNotification(navigationRef);
      } else {
        timer = setTimeout(() => {
          try {
            if (navigationRef.isReady()) {
              checkColdStartNotification(navigationRef);
            }
          } catch (err) {
            console.warn('[RootNavigator] Cold start notification error:', err);
          }
        }, 1000);
      }
    } catch (err) {
      console.warn('[RootNavigator] Push notifications setup error:', err);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (responseSub && typeof responseSub.remove === 'function') responseSub.remove();
      if (tokenRefreshSub && typeof tokenRefreshSub.remove === 'function') tokenRefreshSub.remove();
    };
  }, [user?.id]);

  if (isLoading || hasCompletedLocalOnboarding === null) {
    return (
      <View style={styles.splash}>
        <StatusBar style="light" />

        {/* Empty Spacer */}
        <View style={{ height: 20 }} />

        {/* Center: Logo + EvenTime */}
        <View style={styles.splashCenter}>
          <Image source={APP_ASSETS.logo} style={styles.splashLogo} contentFit="contain" />
          <Text style={styles.splashBrandTitle}>EvenTime</Text>
        </View>

        {/* Bottom: by The SurfBoard */}
        <View style={styles.splashFooter}>
          <Text style={styles.splashByText}>by</Text>
          <Text style={styles.splashSurfboardText}>The SurfBoard</Text>
        </View>
      </View>
    );
  }

  // If user is logged in but hasn't completed onboarding in profile,
  // OR if fresh install on device and hasn't seen onboarding yet
  const requiresOnboarding = (!!user && !isOnboarded) || (!user && !hasCompletedLocalOnboarding);

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      onReady={() => {
        checkColdStartNotification(navigationRef);
      }}
    >
      <Stack.Navigator
        initialRouteName={requiresOnboarding ? 'Onboarding' : 'MainTabs'}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="EventDetail" component={EventDetailScreen} />
        <Stack.Screen
          name="CreateEvent"
          component={CreateEventScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="SavedEvents" component={SavedEventsScreen} />
        <Stack.Screen name="MyPostedEvents" component={MyPostedEventsScreen} />
        <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
        <Stack.Screen name="Admin" component={AdminScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="CityEvents" component={CityEventsScreen} />
        <Stack.Screen name="CuratorProfile" component={CuratorProfileScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        <Stack.Screen name="Terms" component={TermsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#6C47FF',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 56,
  },
  splashCenter: {
    alignItems: 'center',
    gap: 12,
  },
  splashLogo: {
    width: 72,
    height: 72,
    borderRadius: 16,
  },
  splashBrandTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 28,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  splashFooter: {
    alignItems: 'center',
    gap: 2,
  },
  splashByText: {
    fontFamily: 'Switzer-Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  splashSurfboardText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
