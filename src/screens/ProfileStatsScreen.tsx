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
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Calendar,
  Users,
  Heart,
  Bookmark,
  Trophy,
  ChevronRight,
  Plus,
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { theme } from '../config/theme';
import { haptic } from '../lib/haptics';
import type { RootStackParamList } from '../types';

interface ProfileStatsData {
  eventsPosted: number;
  interestedCount: number;
  totalSavesReceived: number;
  personalBookmarks: number;
  etScore: number;
}

export default function ProfileStatsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, profile } = useAuth();

  const [stats, setStats] = useState<ProfileStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      // 1. Fetch user's created events along with attendee interest and save counts
      const { data: myEvents, error: eventsErr } = await supabase
        .from('events')
        .select('id, saved_events(count), interested_events(count)')
        .eq('creator_id', user.id);

      if (eventsErr) throw eventsErr;

      let eventsCount = 0;
      let savesReceived = 0;
      let interestCount = 0;

      if (myEvents) {
        eventsCount = myEvents.length;
        myEvents.forEach((ev: any) => {
          savesReceived += ev.saved_events?.[0]?.count || 0;
          interestCount += ev.interested_events?.[0]?.count || 0;
        });
      }

      // 2. Fetch personal bookmarks count
      const { count: bookmarkCount, error: bookmarkErr } = await supabase
        .from('saved_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (bookmarkErr) throw bookmarkErr;

      // 3. Fetch live ET Score from leaderboard view
      const { data: scoreRow } = await supabase
        .from('leaderboard_view')
        .select('et_score')
        .eq('user_id', user.id)
        .maybeSingle();

      const liveScore = scoreRow?.et_score ?? profile?.et_score ?? 100;

      setStats({
        eventsPosted: eventsCount,
        interestedCount: interestCount,
        totalSavesReceived: savesReceived,
        personalBookmarks: bookmarkCount || 0,
        etScore: liveScore,
      });
    } catch (err) {
      console.warn('[ProfileStatsScreen] Failed to load user metrics:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user, profile]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = () => {
    haptic.light();
    setIsRefreshing(true);
    fetchStats();
  };

  const getTierInfo = (eventsCount: number) => {
    if (eventsCount >= 69) {
      return { label: 'Gold Curator', color: '#F59E0B', bg: '#FEF3C7' };
    }
    if (eventsCount >= 30) {
      return { label: 'Silver Curator', color: '#64748B', bg: '#F1F5F9' };
    }
    return { label: 'Curator', color: theme.colors.brand, bg: theme.colors.brandLight };
  };

  const tier = getTierInfo(stats?.eventsPosted || 0);

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
        <Text style={styles.headerTitle}>Profile Stats & Impact</Text>
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
          <Text style={styles.heroTitle}>Your Activity & Impact</Text>
          <Text style={styles.heroSubtitle}>
            A complete breakdown of events you've curated, community reach, and your saved bookmarks.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.brand} />
          </View>
        ) : (
          <View style={styles.statsGrid}>
            {/* Stat Card 1: Events Posted */}
            <View style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: '#EEF0FF' }]}>
                <Calendar size={20} color="#6C47FF" />
              </View>
              <Text style={styles.statValue}>{stats?.eventsPosted ?? 0}</Text>
              <Text style={styles.statTitle}>Events Posted</Text>
              <Text style={styles.statDesc}>
                Workshops, hackathons, and meetups you have submitted and published for the campus community.
              </Text>
            </View>

            {/* Stat Card 2: Interested Attendees (Audience Intent) */}
            <View style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: '#ECFDF5' }]}>
                <Users size={20} color="#059669" />
              </View>
              <Text style={styles.statValue}>{stats?.interestedCount ?? 0}</Text>
              <Text style={styles.statTitle}>Interested Attendees</Text>
              <Text style={styles.statDesc}>
                Total fellow students and community members who marked interest in attending your events.
              </Text>
            </View>

            {/* Stat Card 3: Saves Received (Curator Reach) */}
            <View style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: '#FEE2E2' }]}>
                <Heart size={20} color="#EF4444" />
              </View>
              <Text style={styles.statValue}>{stats?.totalSavesReceived ?? 0}</Text>
              <Text style={styles.statTitle}>Saves on Your Events</Text>
              <Text style={styles.statDesc}>
                How many times other users bookmarked your posted events to keep track of schedules.
              </Text>
            </View>

            {/* Stat Card 4: Personal Bookmarks */}
            <View style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: '#FEF3C7' }]}>
                <Bookmark size={20} color="#D97706" />
              </View>
              <Text style={styles.statValue}>{stats?.personalBookmarks ?? 0}</Text>
              <Text style={styles.statTitle}>Your Saved Bookmarks</Text>
              <Text style={styles.statDesc}>
                Events you personally saved to your watchlist to attend and follow updates.
              </Text>
            </View>

            {/* Stat Card 5: ET Score & Curator Tier */}
            <View style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: '#EFF6FF' }]}>
                <Trophy size={20} color="#2563EB" />
              </View>
              <View style={styles.scoreRow}>
                <Text style={styles.statValue}>{stats?.etScore ?? 100} ET</Text>
                <View style={[styles.tierBadge, { backgroundColor: tier.bg }]}>
                  <Text style={[styles.tierBadgeText, { color: tier.color }]}>{tier.label}</Text>
                </View>
              </View>
              <Text style={styles.statTitle}>Curator Standing</Text>
              <Text style={styles.statDesc}>
                Earn ET Points by curating accurate events and engaging with the community to climb the campus leaderboard.
              </Text>
            </View>

            {/* Quick Actions Card */}
            <View style={styles.actionCard}>
              <Text style={styles.actionCardHeading}>Quick Actions</Text>

              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => navigation.navigate('MyPostedEvents')}
                activeOpacity={0.7}
              >
                <View style={styles.actionRowLeft}>
                  <Calendar size={16} color={theme.colors.brand} />
                  <Text style={styles.actionRowText}>Manage My Posted Events</Text>
                </View>
                <ChevronRight size={16} color={theme.colors.textMuted} />
              </TouchableOpacity>

              <View style={styles.actionDivider} />

              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => navigation.navigate('SavedEvents')}
                activeOpacity={0.7}
              >
                <View style={styles.actionRowLeft}>
                  <Bookmark size={16} color="#D97706" />
                  <Text style={styles.actionRowText}>View Saved Bookmarks</Text>
                </View>
                <ChevronRight size={16} color={theme.colors.textMuted} />
              </TouchableOpacity>

              <View style={styles.actionDivider} />

              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => navigation.navigate('CreateEvent', {})}
                activeOpacity={0.7}
              >
                <View style={styles.actionRowLeft}>
                  <Plus size={16} color="#059669" />
                  <Text style={styles.actionRowText}>Post a New Event</Text>
                </View>
                <ChevronRight size={16} color={theme.colors.textMuted} />
              </TouchableOpacity>
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
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 2,
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  tierBadgeText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
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
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
  },
  actionCardHeading: {
    fontFamily: 'Switzer-Bold',
    fontSize: 13,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  actionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionRowText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 14,
    color: '#1E293B',
  },
  actionDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
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
