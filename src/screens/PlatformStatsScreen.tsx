import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Calendar, MapPin, Grid, Users } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { CITIES } from '../lib/constants/cities';
import { CATEGORIES_LIST } from '../lib/category-config';
import { theme } from '../config/theme';
import { haptic } from '../lib/haptics';

interface PlatformStatsData {
  eventCount: number;
  totalCitiesCount: number;
  totalCategoryCount: number;
  userCount: number;
}

export default function PlatformStatsScreen() {
  const navigation = useNavigation();
  const [stats, setStats] = useState<PlatformStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const [
        { count: eventCount },
        { count: userCount },
      ] = await Promise.all([
        supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved'),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        eventCount: eventCount || 0,
        totalCitiesCount: CITIES.length,
        totalCategoryCount: CATEGORIES_LIST.length,
        userCount: userCount || 0,
      });
    } catch (err) {
      console.warn('[PlatformStatsScreen] Failed to load live stats:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = () => {
    haptic.light();
    setIsRefreshing(true);
    fetchStats();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            haptic.light();
            navigation.goBack();
          }}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Platform Stats</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.brand]}
            tintColor={theme.colors.brand}
          />
        }
      >
        <View style={styles.heroBlock}>
          <Text style={styles.heroTitle}>EvenTime at a Glance</Text>
          <Text style={styles.heroSubtitle}>
            Real-time platform metrics across events, supported cities, and our community.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.brand} />
          </View>
        ) : (
          <View style={styles.statsGrid}>
            {/* Stat Card 1: Active Events */}
            <View style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: '#EEF0FF' }]}>
                <Calendar size={20} color="#6C47FF" />
              </View>
              <Text style={styles.statValue}>{stats?.eventCount ?? 0}</Text>
              <Text style={styles.statTitle}>Active Events</Text>
              <Text style={styles.statDesc}>
                Curated public and campus events live on the platform right now.
              </Text>
            </View>

            {/* Stat Card 2: Cities Supported */}
            <View style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: '#ECFDF5' }]}>
                <MapPin size={20} color="#059669" />
              </View>
              <Text style={styles.statValue}>{stats?.totalCitiesCount ?? CITIES.length}</Text>
              <Text style={styles.statTitle}>Cities Supported</Text>
              <Text style={styles.statDesc}>
                Major university hubs, metros, and tech centers active across India.
              </Text>
            </View>

            {/* Stat Card 3: Curated Categories */}
            <View style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: '#FEF3C7' }]}>
                <Grid size={20} color="#D97706" />
              </View>
              <Text style={styles.statValue}>{stats?.totalCategoryCount ?? CATEGORIES_LIST.length}</Text>
              <Text style={styles.statTitle}>Curated Categories</Text>
              <Text style={styles.statDesc}>
                From developer hackathons and summits to cultural fests and networking meetups.
              </Text>
            </View>

            {/* Stat Card 4: Community Members */}
            <View style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: '#EDE9FE' }]}>
                <Users size={20} color="#7C3AED" />
              </View>
              <Text style={styles.statValue}>{stats?.userCount ?? 0}</Text>
              <Text style={styles.statTitle}>Community Members</Text>
              <Text style={styles.statDesc}>
                Students, builders, and event curators discovering and connecting on EvenTime.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.footerNote}>
          <Text style={styles.footerNoteText}>
            Updated in real-time. Pull down to refresh live figures.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: theme.colors.textPrimary,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 40,
  },
  heroBlock: {
    marginBottom: 20,
  },
  heroTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    color: '#0F172A',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontFamily: 'Switzer-Regular',
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    gap: 14,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  statIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  statValue: {
    fontFamily: 'Outfit-Bold',
    fontSize: 32,
    color: '#0F172A',
    letterSpacing: -0.8,
    marginBottom: 2,
  },
  statTitle: {
    fontFamily: 'Switzer-Bold',
    fontSize: 15,
    color: '#1E293B',
    marginBottom: 4,
  },
  statDesc: {
    fontFamily: 'Switzer-Regular',
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
  },
  footerNote: {
    alignItems: 'center',
    marginTop: 28,
  },
  footerNoteText: {
    fontFamily: 'Switzer-Regular',
    fontSize: 12,
    color: '#94A3B8',
  },
});
