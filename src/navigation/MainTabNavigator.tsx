import React from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Home, Search, Plus, MapPin, User, Compass } from 'lucide-react-native';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import CitiesScreen from '../screens/CitiesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { theme } from '../config/theme';
import type { MainTabParamList, RootStackParamList } from '../types';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Dummy screen for CreateTab since clicking it navigates to stack CreateEvent modal
function DummyCreateScreen() {
  return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
}

export function MainTabNavigator() {
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.colors.brand,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
          ...theme.shadows.md,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => <Home size={22} color={color} strokeWidth={focused ? 2.5 : 2} />,
        }}
      />

      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Search',
          tabBarIcon: ({ color, focused }) => <Search size={22} color={color} strokeWidth={focused ? 2.5 : 2} />,
        }}
      />

      {/* Center Elevated Create (+) Button */}
      <Tab.Screen
        name="CreateTab"
        component={DummyCreateScreen}
        options={{
          tabBarLabel: 'Post',
          tabBarIcon: () => (
            <View style={styles.createButtonWrapper}>
              <Plus size={22} color="#FFF" strokeWidth={3} />
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
          tabBarIcon: ({ color, focused }) => <MapPin size={22} color={color} strokeWidth={focused ? 2.5 : 2} />,
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => <User size={22} color={color} strokeWidth={focused ? 2.5 : 2} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  createButtonWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    ...theme.shadows.brand,
  },
});
