import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Image } from 'expo-image';
import {
  ArrowLeft,
  CalendarDays,
  Bookmark,
  Award,
  MapPin,
  Clock,
  Layers,
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { EventCard } from '../components/EventCard';
import { parseEventDateString } from '../lib/utils/date';
import type { EventRow, ProfileRow, RootStackParamList } from '../types';

export default function CuratorProfileScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'CuratorProfile'>>();
  const navigation = useNavigation();
  const { username, userId, name } = route.params || {};

  const [curator, setCurator] = useState<ProfileRow | null>(null);
  const [etScore, setEtScore] = useState<number>(100);
  const [totalEventCount, setTotalEventCount] = useState<number>(0);
  const [totalSaves, setTotalSaves] = useState<number>(0);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const fetchCuratorData = useCallback(async () => {
    try {
      setIsLoading(true);
      let curatorQuery = supabase.from('profiles').select('*');

      if (userId) {
        curatorQuery = curatorQuery.eq('id', userId);
      } else if (username) {
        curatorQuery = curatorQuery.eq('username', username.toLowerCase().trim());
      } else {
        setIsLoading(false);
        return;
      }

      const { data: curatorData, error: curatorError } = await curatorQuery.maybeSingle();
      if (curatorError) throw curatorError;

      if (!curatorData) {
        setIsLoading(false);
        return;
      }

      setCurator(curatorData);

      // Fetch leaderboard / ET score
      const { data: scoreRow } = await supabase
        .from('leaderboard_view')
        .select('et_score')
        .eq('user_id', curatorData.id)
        .maybeSingle();

      setEtScore(scoreRow?.et_score ?? curatorData.et_score ?? 100);

      // Fetch all approved events from last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const sixMonthsAgoStr = sixMonthsAgo.toISOString().substring(0, 10);

      const [countRes, savesRes, eventsRes] = await Promise.all([
        supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .eq('creator_id', curatorData.id)
          .eq('status', 'approved'),
        supabase
          .from('events')
          .select('saved_events(count)')
          .eq('creator_id', curatorData.id)
          .eq('status', 'approved'),
        supabase
          .from('events')
          .select('*, interested_events(count), saved_events(count)')
          .eq('creator_id', curatorData.id)
          .eq('status', 'approved')
          .gte('date_string', sixMonthsAgoStr)
          .order('date_string', { ascending: false }),
      ]);

      setTotalEventCount(countRes.count || 0);

      const calculatedSaves = savesRes.data?.reduce(
        (acc: number, ev: any) => acc + (ev.saved_events?.[0]?.count || 0),
        0
      ) || 0;
      setTotalSaves(calculatedSaves);

      setEvents((eventsRes.data as any[]) || []);
    } catch (err) {
      console.error('[CuratorProfile] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [username, userId]);

  useEffect(() => {
    fetchCuratorData();
  }, [fetchCuratorData]);

  // Separate upcoming vs past events
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingEvents = events.filter((e) => {
    const evDate = parseEventDateString(e.date_string || '');
    if (!evDate) return true;
    return evDate >= today;
  });

  const pastEvents = events.filter((e) => {
    const evDate = parseEventDateString(e.date_string || '');
    if (!evDate) return false;
    return evDate < today;
  });

  const displayedEvents = activeTab === 'upcoming' ? upcomingEvents : pastEvents;

  // Tier color calculation based on event count
  let tierBorderColor = theme.colors.brand; // Default purple
  if (totalEventCount >= 69) {
    tierBorderColor = '#F59E0B'; // Gold
  } else if (totalEventCount >= 30) {
    tierBorderColor = '#94A3B8'; // Silver
  } else if (totalEventCount >= 10) {
    tierBorderColor = '#B45309'; // Bronze
  }

  const avatarUrl =
    curator?.avatar_url ||
    `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(
      curator?.full_name || name || 'Curator'
    )}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {curator?.username ? `@${curator.username}` : name || 'Curator Profile'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={theme.colors.brand} />
        </View>
      ) : !curator ? (
        <View style={styles.centerEmpty}>
          <Text style={styles.emptyTitle}>Curator Not Found</Text>
          <Text style={styles.emptySubtitle}>
            This user profile could not be loaded or may no longer exist.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Curator Profile Hero Card */}
          <View style={styles.profileCard}>
            <View style={[styles.avatarRing, { borderColor: tierBorderColor }]}>
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            </View>

            <Text style={styles.fullName}>{curator.full_name || 'Curator'}</Text>
            {curator.username && (
              <Text style={styles.usernameText}>@{curator.username}</Text>
            )}
            {curator.college && (
              <Text style={styles.collegeText}>{curator.college}</Text>
            )}

            {/* Stat Counters */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{totalEventCount}</Text>
                <Text style={styles.statLabel}>EVENTS</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{totalSaves}</Text>
                <Text style={styles.statLabel}>SAVES</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={[styles.statBox, styles.scoreBox]}>
                <Text style={styles.scoreNumber}>{etScore}</Text>
                <Text style={styles.scoreLabel}>ET SCORE</Text>
              </View>
            </View>
          </View>

          {/* Tab Selector: Upcoming vs Past Events */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'upcoming' && styles.tabButtonActive]}
              onPress={() => setActiveTab('upcoming')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === 'upcoming' && styles.tabButtonTextActive,
                ]}
              >
                Upcoming ({upcomingEvents.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'past' && styles.tabButtonActive]}
              onPress={() => setActiveTab('past')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === 'past' && styles.tabButtonTextActive,
                ]}
              >
                Past Archive ({pastEvents.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Events List */}
          <View style={styles.eventsSection}>
            {displayedEvents.length === 0 ? (
              <View style={styles.noEventsBox}>
                <Layers size={36} color="#CBD5E1" />
                <Text style={styles.noEventsTitle}>
                  {activeTab === 'upcoming'
                    ? 'No upcoming events curated'
                    : 'No past events in archive'}
                </Text>
                <Text style={styles.noEventsSubtitle}>
                  Check back later for new events curated by @{curator.username || 'this user'}.
                </Text>
              </View>
            ) : (
              <View style={styles.eventGrid}>
                {displayedEvents.map((item) => (
                  <View key={item.id} style={styles.eventCardWrapper}>
                    <EventCard
                      event={item}
                      id={item.id}
                      slug={item.slug || item.id}
                      title={item.title}
                      category={item.category || 'General'}
                      dateString={item.date_string || ''}
                      startTime={item.start_time || undefined}
                      location={item.location || ''}
                      city={item.city || ''}
                      organizerName={item.organizer_name || curator.full_name || 'Organizer'}
                      organizerUsername={curator.username || undefined}
                      isFree={item.is_free ?? true}
                      isFeatured={item.is_featured ?? false}
                      posterUrl={item.poster_url || undefined}
                      interestedCount={item.interested_events?.[0]?.count ?? item.interested_count ?? 0}
                      hideOrganizer={true}
                      hidePastBadge={activeTab === 'past'}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 44,
  },
  fullName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  usernameText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.brand,
    marginBottom: 4,
  },
  collegeText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  scoreBox: {
    backgroundColor: '#FFFBEB',
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  scoreNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#D97706',
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  eventsSection: {
    minHeight: 200,
  },
  eventGrid: {
    gap: 16,
  },
  eventCardWrapper: {
    width: '100%',
  },
  noEventsBox: {
    padding: 32,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  noEventsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 4,
  },
  noEventsSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
});
