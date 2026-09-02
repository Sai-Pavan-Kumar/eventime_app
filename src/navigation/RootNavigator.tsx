import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
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
    registerForPushNotificationsAsync(user?.id);
    const tokenRefreshSub = setupPushTokenRefreshListener(user?.id);

    // 1. Listen for notification taps when app is in foreground or background
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (navigationRef.isReady()) {
        handleNotificationResponse(navigationRef, response);
      }
    });

    // 2. Check if app was launched directly from a notification tap (Cold start)
    if (navigationRef.isReady()) {
      checkColdStartNotification(navigationRef);
    } else {
      const timer = setTimeout(() => {
        if (navigationRef.isReady()) {
          checkColdStartNotification(navigationRef);
        }
      }, 1000);
      return () => {
        clearTimeout(timer);
        responseSub.remove();
        tokenRefreshSub.remove();
      };
    }

    return () => {
      responseSub.remove();
      tokenRefreshSub.remove();
    };
  }, [user?.id]);

  if (isLoading || hasCompletedLocalOnboarding === null) {
    return (
      <View style={styles.splash}>
        <StatusBar style="light" />
        
        {/* Empty Spacer to balance layout */}
        <View style={{ height: 40 }} />

        {/* Center Brand Identity */}
        <View style={styles.splashCenter}>
          <View style={styles.splashLogoCard}>
            <Image source={APP_ASSETS.logo} style={styles.splashLogo} contentFit="contain" />
          </View>
          <Text style={styles.splashBrandTitle}>EvenTime</Text>
          <Text style={styles.splashBrandSubtitle}>Discover Events & Campus Life</Text>
        </View>

        {/* Bottom "by The SurfBoard" Branding */}
        <View style={styles.splashFooter}>
          <Text style={styles.splashFooterBy}>BY</Text>
          <View style={styles.splashSurfboardRow}>
            <Image source={APP_ASSETS.sbLogo} style={styles.splashSbLogo} contentFit="contain" />
            <Text style={styles.splashSurfboardText}>The SurfBoard</Text>
          </View>
        </View>
      </View>
    );
  }

  // If user is logged in but hasn't completed onboarding in profile,
  // OR if fresh install on device and hasn't seen onboarding yet
  const requiresOnboarding = (!!user && !isOnboarded) || (!user && !hasCompletedLocalOnboarding);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {requiresOnboarding ? (
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
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
          </>
        )}
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
  },
  splashLogoCard: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  splashLogo: {
    width: 62,
    height: 62,
    borderRadius: 14,
  },
  splashBrandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  splashBrandSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.82)',
    letterSpacing: 0.2,
  },
  splashFooter: {
    alignItems: 'center',
    gap: 6,
  },
  splashFooterBy: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.65)',
    letterSpacing: 2,
  },
  splashSurfboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  splashSbLogo: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },
  splashSurfboardText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
