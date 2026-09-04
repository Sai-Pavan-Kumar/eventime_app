import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { CalendarDays, Trophy } from 'lucide-react-native';
import { APP_ASSETS } from '../../lib/asset-registry';

export interface HomeHeaderProps {
  selectedDate: string | null;
  onOpenCalendar: () => void;
  onOpenLeaderboard: () => void;
  greeting: string;
  platformStats: {
    event_count: number;
    city_count: number;
    category_count: number;
    user_count: number;
  };
  eventsCount: number;
}

export const HomeHeader = React.memo<HomeHeaderProps>(({
  selectedDate,
  onOpenCalendar,
  onOpenLeaderboard,
  greeting,
  platformStats,
  eventsCount,
}) => {
  return (
    <View style={styles.headerContainer}>
      {/* Top Bar with Brand Logo and Action Icons */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Image
            source={APP_ASSETS.logo}
            style={styles.brandLogo}
            contentFit="contain"
          />
          <Text style={styles.brandNameText}>EvenTime</Text>
        </View>

        <View style={styles.topActions}>
          {/* Top Calendar Date Button */}
          <TouchableOpacity
            style={[styles.topCalendarBtn, Boolean(selectedDate) && styles.topCalendarBtnActive]}
            onPress={onOpenCalendar}
            activeOpacity={0.8}
          >
            <CalendarDays size={15} color={selectedDate ? '#6C47FF' : '#475569'} />
            <Text style={[styles.topCalendarBtnText, Boolean(selectedDate) && styles.topCalendarBtnTextActive]}>
              {selectedDate
                ? new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
                : new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
            </Text>
          </TouchableOpacity>

          {/* Leaderboard Trophy Icon */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onOpenLeaderboard}
            activeOpacity={0.8}
          >
            <Trophy size={18} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dynamic Time-of-Day Greeting */}
      <View style={styles.greetingContainer}>
        <Text style={styles.greetingText} numberOfLines={1} ellipsizeMode="tail">
          {greeting}
        </Text>
      </View>

      {/* Live Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{platformStats.event_count || eventsCount || 0}</Text>
          <Text style={styles.statLabel}>EVENTS</Text>
        </View>
        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{platformStats.city_count || 12}</Text>
          <Text style={styles.statLabel}>CITIES</Text>
        </View>
        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{platformStats.category_count || 36}</Text>
          <Text style={styles.statLabel}>CATEGORIES</Text>
        </View>
        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{platformStats.user_count || 50}</Text>
          <Text style={styles.statLabel}>USERS</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  brandNameText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topCalendarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  topCalendarBtnActive: {
    backgroundColor: '#EDE9FE',
  },
  topCalendarBtnText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: '#475569',
  },
  topCalendarBtnTextActive: {
    color: '#6C47FF',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  greetingContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  greetingText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: '#0F172A',
  },
  statLabel: {
    fontFamily: 'Switzer-Bold',
    fontSize: 10,
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#E2E8F0',
  },
});
