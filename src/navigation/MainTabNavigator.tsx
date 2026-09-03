import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Home, Search, Plus, MapPin, User } from 'lucide-react-native';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import CitiesScreen from '../screens/CitiesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { theme } from '../config/theme';
import type { MainTabParamList, RootStackParamList } from '../types';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Dummy screen for CreateTab since clicking it opens stack CreateEvent modal
function DummyCreateScreen() {
  return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
}

export function MainTabNavigator() {
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const safeBottom = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 8);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#6C47FF',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F1F5F9',
          borderTopWidth: 1,
          height: 62 + safeBottom,
          paddingBottom: safeBottom + 2,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontFamily: 'Switzer-Bold',
          fontSize: 11,
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Home size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />

      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Search',
          tabBarIcon: ({ color, focused }) => (
            <Search size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />

      {/* Center Elevated Floating Post (+) Button */}
      <Tab.Screen
        name="CreateTab"
        component={DummyCreateScreen}
        options={{
          tabBarLabel: 'Post',
          tabBarLabelStyle: {
            fontFamily: 'Switzer-Bold',
            fontSize: 11,
            marginTop: 4,
            color: '#6C47FF',
          },
          tabBarIcon: () => (
            <View style={styles.elevatedButtonContainer}>
              <View style={styles.createButtonWrapper}>
                <Plus size={24} color="#FFFFFF" strokeWidth={3} />
              </View>
            </View>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            rootNavigation.navigate('CreateEvent', {});
          },
        }}
      />

      <Tab.Screen
        name="CitiesTab"
        component={CitiesScreen}
        options={{
          tabBarLabel: 'Cities',
          tabBarIcon: ({ color, focused }) => (
            <MapPin size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <User size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  elevatedButtonContainer: {
    top: -14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6C47FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#6C47FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});
