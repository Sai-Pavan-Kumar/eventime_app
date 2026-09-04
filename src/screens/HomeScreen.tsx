import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Compass,
  Building2,
  Calendar as CalendarIcon,
  CalendarDays,
  Trophy,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Sparkles,
  WifiOff,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { EventCard } from '../components/EventCard';
import { EmptyState } from '../components/EmptyState';
import { FeedSkeleton } from '../components/EventCardSkeleton';
import { SmartRatingModal } from '../components/SmartRatingModal';
import { DelayedPromptModal } from '../components/DelayedPromptModal';
import { shouldShowRatingPrompt } from '../lib/rating-prompt';
import { APP_ASSETS } from '../lib/asset-registry';
import { parseEventDateString } from '../lib/utils/date';
import { getGuestPreferences, OnboardingData } from '../lib/guest-preferences';
import { haptic } from '../lib/haptics';
import { withTimeout } from '../lib/api-resilience';
import {
  loadCachedHomeEvents,
  saveCachedHomeEvents,
  loadCachedCampusEvents,
  saveCachedCampusEvents,
  loadCachedPlatformStats,
  saveCachedPlatformStats,
  loadCachedSavedEventIds,
  saveCachedSavedEventIds,
} from '../lib/offline-cache';
import { HomeHeader } from '../components/home/HomeHeader';
import { HomeSegmentedTabs } from '../components/home/HomeSegmentedTabs';
import { HomeActiveDateBanner } from '../components/home/HomeActiveDateBanner';
import { CalendarPickerModal } from '../components/CalendarPickerModal';
import type { EventRow, RootStackParamList } from '../types';

const { width } = Dimensions.get('window');

const getTimeOfDayGreeting = (name?: string) => {
  const h = new Date().getHours();
  const userName = name ? (name.length > 12 ? name.slice(0, 12) : name) : 'there';
  if (h >= 6 && h < 9) return `Morning, ${userName}.`;
  if (h >= 9 && h < 12) return `Tiffin time, ${userName}.`;
  if (h >= 12 && h < 14) return `Afternoon, ${userName}.`;
  if (h >= 14 && h < 17) return `Lunch done, ${userName}?`;
  if (h >= 17 && h < 18) return `Snack time, ${userName}.`;
  if (h >= 18 && h < 20) return `Evening, ${userName}.`;
  if (h >= 20 && h < 22) return `Dinner time, ${userName}.`;
  if (h >= 22 && h < 23) return `Dinner done yet, ${userName}?`;
  if (h >= 23 || h < 0) return `Night, ${userName} — sleep well.`;
  if (h >= 0 && h < 4) return `Still up, ${userName}?`;
  return `Up early, ${userName}?`;
};

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, profile } = useAuth();

  const [guestPrefs, setGuestPrefs] = useState<OnboardingData | null>(null);

  useEffect(() => {
    if (!user) {
      getGuestPreferences().then((prefs) => {
        if (prefs) setGuestPrefs(prefs);
      });
    }
  }, [user]);

  const isStudent = Boolean(
    (user && profile?.user_type === 'student' && profile?.college_id) ||
    (!user && guestPrefs?.userType === 'student' && guestPrefs?.collegeId)
  );
  const hasGoals = Boolean(
    (profile?.goals && profile.goals.length > 0) ||
    (guestPrefs?.goals && guestPrefs.goals.length > 0)
  );

  const pagerRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeTabIdx, setActiveTabIdx] = useState(0);

  const tabs = useMemo(() => {
    return isStudent
      ? [
          { key: 'for_you' as const, label: 'For You' },
          { key: 'around_you' as const, label: 'Around You' },
          { key: 'campus' as const, label: 'Your Campus' },
        ]
      : [
          { key: 'for_you' as const, label: 'For You' },
          { key: 'around_you' as const, label: 'Around You' },
        ];
  }, [isStudent]);

  const trackWidth = width - 32;
  const tabWidth = (trackWidth - 6) / tabs.length;

  const translateX = scrollX.interpolate({
    inputRange: tabs.map((_, i) => i * width),
    outputRange: tabs.map((_, i) => i * tabWidth),
    extrapolate: 'clamp',
  });

  const handleSelectTab = (idx: number) => {
    haptic.light();
    setActiveTabIdx(idx);
    pagerRef.current?.scrollTo({ x: idx * width, animated: true });
  };

  const onMomentumScrollEnd = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const newIdx = Math.round(offsetX / width);
    if (newIdx >= 0 && newIdx < tabs.length && newIdx !== activeTabIdx) {
      haptic.light();
      setActiveTabIdx(newIdx);
    }
  };

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Calendar modal state
  const [showDateModal, setShowDateModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [eventDates, setEventDates] = useState<Set<string>>(new Set());

  // 5-Day Smart Rating Prompt Trigger
  useEffect(() => {
    const timer = setTimeout(async () => {
      const shouldPrompt = await shouldShowRatingPrompt();
      if (shouldPrompt) {
        setShowRatingModal(true);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [campusEvents, setCampusEvents] = useState<EventRow[]>([]);
  const [savedEventIds, setSavedEventIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Pagination states for Public Feeds
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Pagination states for Campus Feed
  const [campusPage, setCampusPage] = useState(0);
  const [hasMoreCampus, setHasMoreCampus] = useState(true);
  const [isFetchingMoreCampus, setIsFetchingMoreCampus] = useState(false);

  const PAGE_SIZE = 15;

  // Platform stats for live ticker (Matching website parity)
  const [platformStats, setPlatformStats] = useState<{
    event_count: number;
    city_count: number;
    category_count: number;
    user_count: number;
  }>({
    event_count: 0,
    city_count: 12,
    category_count: 36,
    user_count: 0,
  });

  // 1. Instant 0ms Cold-Start Hydration from Local Storage (Stale-While-Revalidate)
  useEffect(() => {
    loadCachedHomeEvents().then((cached) => {
      if (cached && cached.length > 0) {
        setEvents(cached);
        setIsLoading(false);
      }
    });

    loadCachedCampusEvents().then((cEvents) => {
      if (cEvents && cEvents.length > 0) {
        setCampusEvents(cEvents);
      }
    });

    loadCachedPlatformStats().then((cachedStats) => {
      if (cachedStats) {
        setPlatformStats(cachedStats);
      }
    });

    loadCachedSavedEventIds().then((cachedIds) => {
      if (cachedIds) {
        setSavedEventIds(cachedIds);
      }
    });
  }, []);

  const fetchPlatformStats = useCallback(async (forceRefresh: boolean = false) => {
    try {
      const { data: statsData, error } = await supabase.rpc('get_platform_stats').single();
      let freshStats: any;
      if (!error && statsData) {
        freshStats = statsData;
      } else {
        const [{ count: eventCount }, { count: userCount }] = await Promise.all([
          supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
        ]);
        freshStats = {
          event_count: eventCount || 0,
          city_count: 12,
          category_count: 36,
          user_count: userCount || 0,
        };
      }
      setPlatformStats(freshStats);
      saveCachedPlatformStats(freshStats);
    } catch (e) {
      console.warn('[HomeScreen] Failed to load stats', e);
    }
  }, []);

  // Fetch all distinct event dates to show dot indicators in the calendar
  useEffect(() => {
    fetchPlatformStats();
    supabase
      .from('events')
      .select('date_string')
      .eq('status', 'approved')
      .or('college_only.is.null,college_only.eq.false')
      .then(({ data }) => {
        if (data) {
          const datesSet = new Set<string>();
          data.forEach((e) => {
            const parsed = parseEventDateString(e.date_string || '');
            if (parsed) {
              const y = parsed.getFullYear();
              const m = String(parsed.getMonth() + 1).padStart(2, '0');
              const d = String(parsed.getDate()).padStart(2, '0');
              datesSet.add(`${y}-${m}-${d}`);
            }
          });
          setEventDates(datesSet);
        }
      });
  }, [fetchPlatformStats]);

  const fetchSavedEventIds = useCallback(async () => {
    if (!user) {
      setSavedEventIds(new Set());
      return;
    }
    try {
      const { data } = await supabase
        .from('saved_events')
        .select('event_id')
        .eq('user_id', user.id);
      if (data) {
        const idSet = new Set(data.map((d) => d.event_id).filter(Boolean) as string[]);
        setSavedEventIds(idSet);
        saveCachedSavedEventIds(idSet);
      }
    } catch (e) {
      console.error('[HomeScreen] Saved events error:', e);
    }
  }, [user]);

  const fetchEvents = useCallback(async (pageIndex = 0, forceRefresh = false) => {
    try {
      if (pageIndex === 0 && !forceRefresh) {
        // Only trigger full spinner if we don't already have cached events
        setEvents((prev) => {
          if (prev.length === 0) setIsLoading(true);
          return prev;
        });
      }

      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // 1. Fetch public approved events (strictly exclude college-only events)
      let query = supabase
        .from('events')
        .select('*, colleges(name), profiles(username, full_name), interested_events(count)')
        .eq('status', 'approved')
        .or('college_only.is.null,college_only.eq.false');

      if (selectedDate) {
        query = query.eq('date_string', selectedDate);
      }

      query = query
        .order('date_string', { ascending: true })
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data, error } = await withTimeout(query, 8000);

      if (error) {
        throw error;
      }

      const rawEvents = (data as any[]) || [];
      setIsOffline(false);
      
      if (rawEvents.length < PAGE_SIZE) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      setEvents((prev) => {
        if (pageIndex === 0) {
          saveCachedHomeEvents(rawEvents);
          return rawEvents;
        }
        const existingIds = new Set(prev.map((e) => e.id));
        const freshOnly = rawEvents.filter((e) => !existingIds.has(e.id));
        const merged = [...prev, ...freshOnly];
        saveCachedHomeEvents(merged);
        return merged;
      });
    } catch (err) {
      console.warn('[HomeScreen] Fetch error, keeping cached data:', err);
      setIsOffline(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsFetchingMore(false);
    }
  }, [selectedDate]);

  const fetchCampusEvents = useCallback(async (pageIndex = 0, forceRefresh = false) => {
    if (!user || profile?.user_type !== 'student' || !profile?.college_id) return;
    try {
      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('events')
        .select('*, colleges(name), profiles(username, full_name), interested_events(count)')
        .eq('status', 'approved')
        .eq('college_id', profile.college_id);

      if (selectedDate) {
        query = query.eq('date_string', selectedDate);
      }

      query = query
        .order('date_string', { ascending: true })
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data, error } = await withTimeout(query, 8000);
      if (error) throw error;

      const rawCampus = (data as any[]) || [];
      if (rawCampus.length < PAGE_SIZE) {
        setHasMoreCampus(false);
      } else {
        setHasMoreCampus(true);
      }

      setCampusEvents((prev) => {
        if (pageIndex === 0) {
          saveCachedCampusEvents(rawCampus);
          return rawCampus;
        }
        const existingIds = new Set(prev.map((e) => e.id));
        const freshOnly = rawCampus.filter((e) => !existingIds.has(e.id));
        const merged = [...prev, ...freshOnly];
        saveCachedCampusEvents(merged);
        return merged;
      });
    } catch (err) {
      console.warn('[HomeScreen] Campus fetch error:', err);
    } finally {
      setIsFetchingMoreCampus(false);
    }
  }, [user, profile, selectedDate]);

  const loadMoreEvents = () => {
    if (!hasMore || isFetchingMore || isLoading || isRefreshing) return;
    setIsFetchingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchEvents(nextPage);
  };

  const loadMoreCampusEvents = () => {
    if (!hasMoreCampus || isFetchingMoreCampus || isLoading || isRefreshing) return;
    setIsFetchingMoreCampus(true);
    const nextPage = campusPage + 1;
    setCampusPage(nextPage);
    fetchCampusEvents(nextPage);
  };

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    setCampusPage(0);
    setHasMoreCampus(true);
    fetchEvents(0);
    fetchCampusEvents(0);
    fetchSavedEventIds();
  }, [fetchEvents, fetchCampusEvents, fetchSavedEventIds, selectedDate]);

  const onRefresh = () => {
    setIsRefreshing(true);
    setPage(0);
    setHasMore(true);
    setCampusPage(0);
    setHasMoreCampus(true);
    fetchEvents(0, true);
    fetchCampusEvents(0, true);
    fetchSavedEventIds();
    fetchPlatformStats(true);
  };

  // 1. Base date-filtered pool
  const basePool = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate) {
      return events.filter((ev) => {
        const parsed = parseEventDateString(ev.date_string || '');
        if (!parsed) return false;
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const d = String(parsed.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}` === selectedDate;
      });
    }

    const upcoming = events.filter((ev) => {
      const parsed = parseEventDateString(ev.date_string || '');
      if (!parsed) return true;
      const evDate = new Date(parsed);
      evDate.setHours(0, 0, 0, 0);
      return evDate.getTime() >= today.getTime();
    });

    // Graceful fallback: If upcoming events exist, show them; otherwise fallback to full events pool
    return upcoming.length > 0 ? upcoming : events;
  }, [events, selectedDate]);

  const preferredCities: string[] = useMemo(() => {
    return profile?.preferred_cities?.length
      ? profile.preferred_cities
      : (guestPrefs?.preferredCities || []);
  }, [profile?.preferred_cities, guestPrefs?.preferredCities]);

  const citiesLabel = useMemo(() => {
    if (!preferredCities.length) return 'your city';
    if (preferredCities.length === 1) return preferredCities[0];
    if (preferredCities.length === 2) return `${preferredCities[0]} & ${preferredCities[1]}`;
    return `${preferredCities[0]}, ${preferredCities[1]} +${preferredCities.length - 2}`;
  }, [preferredCities]);

  const preferredGoals: string[] = useMemo(() => {
    return profile?.goals?.length
      ? profile.goals
      : (guestPrefs?.goals || []);
  }, [profile?.goals, guestPrefs?.goals]);

  // Tab 0: For You Events
  const forYouEvents = useMemo(() => {
    if (preferredCities.length === 0 || preferredGoals.length === 0) {
      return [];
    }
    const goalSet = new Set(preferredGoals.map((g) => g.toLowerCase().trim()));
    const citySet = new Set(preferredCities.map((c) => c.toLowerCase().trim()));

    const filtered = basePool.filter((e) => {
      const matchesCity =
        Boolean(e.is_virtual) ||
        (e.city ? citySet.has(e.city.toLowerCase().trim()) : false);
      const matchesCategory =
        e.category ? goalSet.has(e.category.toLowerCase().trim()) : false;
      return matchesCity && matchesCategory;
    });

    return filtered.sort((a, b) => {
      const da = parseEventDateString(a.date_string)?.getTime() || 0;
      const db = parseEventDateString(b.date_string)?.getTime() || 0;
      return da - db;
    });
  }, [basePool, preferredCities, preferredGoals]);

  // Tab 1: Around You Events
  const aroundYouEvents = useMemo(() => {
    if (preferredCities.length === 0) {
      return [];
    }
    const citySet = new Set(preferredCities.map((c) => c.toLowerCase().trim()));
    const goalSet = new Set(preferredGoals.map((g) => g.toLowerCase().trim()));

    const filtered = basePool.filter((e) => {
      const matchesCity =
        Boolean(e.is_virtual) ||
        (e.city ? citySet.has(e.city.toLowerCase().trim()) : false);
      if (!matchesCity) return false;
      if (goalSet.size > 0 && e.category && goalSet.has(e.category.toLowerCase().trim())) {
        return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      const da = parseEventDateString(a.date_string)?.getTime() || 0;
      const db = parseEventDateString(b.date_string)?.getTime() || 0;
      return da - db;
    });
  }, [basePool, preferredCities, preferredGoals]);

  // Tab 2: Campus Feed Events (Students only)
  const campusFeedEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let list = campusEvents;
    if (selectedDate) {
      list = list.filter((ev) => {
        const parsed = parseEventDateString(ev.date_string || '');
        if (!parsed) return false;
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const d = String(parsed.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}` === selectedDate;
      });
    } else {
      list = list.filter((ev) => {
        const parsed = parseEventDateString(ev.date_string || '');
        if (!parsed) return true;
        const evDate = new Date(parsed);
        evDate.setHours(0, 0, 0, 0);
        return evDate.getTime() >= today.getTime();
      });
    }

    return list.sort((a, b) => {
      const da = parseEventDateString(a.date_string)?.getTime() || 0;
      const db = parseEventDateString(b.date_string)?.getTime() || 0;
      return da - db;
    });
  }, [campusEvents, selectedDate]);

  const renderEventItem = useCallback(
    ({ item }: { item: EventRow }) => (
      <View style={styles.cardContainer}>
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
          organizerName={(item as any).profiles?.full_name || item.organizer_name || 'Organizer'}
          organizerUsername={(item as any).profiles?.username || undefined}
          isFree={item.is_free ?? true}
          isFeatured={item.is_featured ?? false}
          posterUrl={item.poster_url || undefined}
          interestedCount={(item as any).interested_events?.[0]?.count ?? item.interested_count ?? 0}
          isSaved={savedEventIds.has(item.id)}
          onSaveToggle={(id, isSaved) => {
            setSavedEventIds((prev) => {
              const next = new Set(prev);
              if (isSaved) next.add(id);
              else next.delete(id);
              saveCachedSavedEventIds(next);
              return next;
            });
          }}
        />
      </View>
    ),
    [savedEventIds]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Stationary Top Header Container */}
      <View style={styles.headerFixedContainer}>
        <HomeHeader
          selectedDate={selectedDate}
          onOpenCalendar={() => setShowDateModal(true)}
          onOpenLeaderboard={() => navigation.navigate('Leaderboard')}
          greeting={getTimeOfDayGreeting(profile?.username?.trim().slice(0, 12) || profile?.full_name?.split(' ')[0]?.trim().slice(0, 12) || (user ? undefined : 'explorer'))}
          platformStats={platformStats}
          eventsCount={events.length}
        />

        <HomeSegmentedTabs
          tabs={tabs}
          activeTabIdx={activeTabIdx}
          onSelectTab={handleSelectTab}
          tabWidth={tabWidth}
          translateX={translateX}
        />

        {selectedDate && (
          <HomeActiveDateBanner
            selectedDate={selectedDate}
            onClearDate={() => setSelectedDate(null)}
          />
        )}

        {isOffline && events.length > 0 && (
          <View style={styles.offlineBanner}>
            <WifiOff size={13} color="#92400E" />
            <Text style={styles.offlineBannerText}>Offline • Showing saved events</Text>
          </View>
        )}
      </View>

      {/* Horizontally Swipeable Feeds Container */}
      {isLoading ? (
        <FeedSkeleton count={3} />
      ) : (
        <Animated.ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          directionalLockEnabled={true}
          nestedScrollEnabled={true}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          onMomentumScrollEnd={onMomentumScrollEnd}
          style={{ flex: 1 }}
        >
          {/* Page 0: For You Feed */}
          <View style={styles.pageContainer}>
            <FlatList
              data={forYouEvents}
              keyExtractor={(item) => item.id}
              renderItem={renderEventItem}
              ListHeaderComponent={
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {selectedDate
                      ? `Events on ${new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`
                      : 'For You'}
                  </Text>
                  <Text style={styles.eventCountText}>{forYouEvents.length} events</Text>
                </View>
              }
              ListEmptyComponent={
                <EmptyState
                  illustration={APP_ASSETS.illustrations.empty}
                  title={
                    selectedDate
                      ? 'No Events Scheduled'
                      : aroundYouEvents.length > 0
                      ? 'No Events In Your Categories'
                      : `No Events in ${citiesLabel}`
                  }
                  message={
                    selectedDate
                      ? `There are no events scheduled for ${new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}. Be the first to host one!`
                      : aroundYouEvents.length > 0
                      ? `Events are happening in ${citiesLabel}, but none currently match your selected interest categories. Explore 'Around You' to discover them, or update your preferences in Profile!`
                      : `No upcoming events found in ${citiesLabel}. Add more cities in your Profile or host an event yourself to get the community buzzing!`
                  }
                  buttonText={
                    selectedDate
                      ? 'Clear Date'
                      : aroundYouEvents.length > 0
                      ? 'Explore Around You'
                      : 'Update Preferences'
                  }
                  onButtonPress={() => {
                    if (selectedDate) {
                      setSelectedDate(null);
                    } else if (aroundYouEvents.length > 0) {
                      handleSelectTab(1);
                    } else {
                      (navigation as any).navigate('ProfileTab');
                    }
                  }}
                />
              }
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={onRefresh}
                  colors={[theme.colors.brand]}
                  tintColor={theme.colors.brand}
                />
              }
              initialNumToRender={6}
              maxToRenderPerBatch={8}
              windowSize={5}
              removeClippedSubviews={Platform.OS === 'android'}
              updateCellsBatchingPeriod={50}
              onEndReached={loadMoreEvents}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                isFetchingMore ? (
                  <View style={{ paddingVertical: 20 }}>
                    <ActivityIndicator size="small" color={theme.colors.brand} />
                  </View>
                ) : null
              }
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          </View>

          {/* Page 1: Around You Feed */}
          <View style={styles.pageContainer}>
            <FlatList
              data={aroundYouEvents}
              keyExtractor={(item) => item.id}
              renderItem={renderEventItem}
              ListHeaderComponent={
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {selectedDate
                      ? `Events on ${new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`
                      : 'Around You'}
                  </Text>
                  <Text style={styles.eventCountText}>{aroundYouEvents.length} events</Text>
                </View>
              }
              ListEmptyComponent={
                <EmptyState
                  illustration={APP_ASSETS.illustrations.empty}
                  title={
                    selectedDate
                      ? 'No Events Scheduled'
                      : forYouEvents.length > 0
                      ? `All caught up in ${citiesLabel}!`
                      : `No Events in ${citiesLabel}`
                  }
                  message={
                    selectedDate
                      ? `There are no events scheduled for ${new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}. Be the first to host one!`
                      : forYouEvents.length > 0
                      ? `All scheduled events in ${citiesLabel} currently match your selected interests and are waiting in 'For You'. Check back soon as new categories are added!`
                      : `No upcoming events found in ${citiesLabel}. Add more cities in your Profile or host an event yourself to get the community started!`
                  }
                  buttonText={
                    selectedDate
                      ? 'Clear Date'
                      : forYouEvents.length > 0
                      ? 'View For You'
                      : 'Update Cities'
                  }
                  onButtonPress={() => {
                    if (selectedDate) {
                      setSelectedDate(null);
                    } else if (forYouEvents.length > 0) {
                      handleSelectTab(0);
                    } else {
                      (navigation as any).navigate('ProfileTab');
                    }
                  }}
                />
              }
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={onRefresh}
                  colors={[theme.colors.brand]}
                  tintColor={theme.colors.brand}
                />
              }
              initialNumToRender={6}
              maxToRenderPerBatch={8}
              windowSize={5}
              removeClippedSubviews={Platform.OS === 'android'}
              updateCellsBatchingPeriod={50}
              onEndReached={loadMoreEvents}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                isFetchingMore ? (
                  <View style={{ paddingVertical: 20 }}>
                    <ActivityIndicator size="small" color={theme.colors.brand} />
                  </View>
                ) : null
              }
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          </View>

          {/* Page 2: Your Campus Feed (Students only) */}
          {isStudent && (
            <View style={styles.pageContainer}>
              <FlatList
                data={campusFeedEvents}
                keyExtractor={(item) => item.id}
                renderItem={renderEventItem}
                ListHeaderComponent={
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                      {selectedDate
                        ? `Events on ${new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`
                        : 'Your Campus'}
                    </Text>
                    <Text style={styles.eventCountText}>{campusFeedEvents.length} events</Text>
                  </View>
                }
                ListEmptyComponent={
                  <EmptyState
                    illustration={APP_ASSETS.illustrations.empty}
                    title={selectedDate ? 'No Events Scheduled' : 'No Campus Events'}
                    message={
                      selectedDate
                        ? `There are no events scheduled for ${new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}. Be the first to host one!`
                        : 'There are no private events currently listed for your campus. Host one for your college!'
                    }
                    buttonText={selectedDate ? 'Clear Date' : 'Host an Event'}
                    onButtonPress={() => {
                      if (selectedDate) {
                        setSelectedDate(null);
                      } else {
                        navigation.navigate('CreateEvent', {});
                      }
                    }}
                  />
                }
                refreshControl={
                  <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={onRefresh}
                    colors={[theme.colors.brand]}
                    tintColor={theme.colors.brand}
                  />
                }
                initialNumToRender={6}
                maxToRenderPerBatch={8}
                windowSize={5}
                removeClippedSubviews={Platform.OS === 'android'}
                updateCellsBatchingPeriod={50}
                onEndReached={loadMoreCampusEvents}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                  isFetchingMoreCampus ? (
                    <View style={{ paddingVertical: 20 }}>
                      <ActivityIndicator size="small" color={theme.colors.brand} />
                    </View>
                  ) : null
                }
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            </View>
          )}
        </Animated.ScrollView>
      )}

      {/* Shared Calendar Month Grid Modal */}
      <CalendarPickerModal
        visible={showDateModal}
        selectedDate={selectedDate}
        eventDates={eventDates}
        onSelectDate={(dateStr) => setSelectedDate(dateStr)}
        onClearDate={() => setSelectedDate(null)}
        onClose={() => setShowDateModal(false)}
      />

      {/* 5-Day Smart In-App Rating Gate */}
      <SmartRatingModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
      />

      {/* Guest Delayed Action Teaser */}
      <DelayedPromptModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 32,
  },
  cardContainer: {
    paddingHorizontal: 16,
  },
  headerFixedContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    zIndex: 10,
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
    fontFamily: 'Switzer-Medium',
    fontSize: 13,
    color: '#64748B',
  },
  statsBar: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statNumber: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    color: '#6C47FF',
  },
  statLabel: {
    fontFamily: 'Switzer-Bold',
    fontSize: 10,
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#E2E8F0',
  },
  segmentedTrackContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  segmentedTrack: {
    height: 42,
    backgroundColor: '#F1F5F9',
    borderRadius: 100,
    padding: 3,
    position: 'relative',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  slidingThumb: {
    position: 'absolute',
    left: 3,
    top: 3,
    bottom: 3,
    backgroundColor: '#0F172A',
    borderRadius: 100,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  segmentBtn: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  segmentBtnText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 13,
    color: '#64748B',
    letterSpacing: -0.2,
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
  },
  pageContainer: {
    width,
    flex: 1,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillSelected: {
    backgroundColor: '#EDE9FE',
    borderColor: '#C4B5FD',
  },
  filterPillText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 12,
    color: '#475569',
  },
  filterPillTextSelected: {
    fontFamily: 'Switzer-Bold',
    color: '#6C47FF',
  },
  clearPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
  },
  clearPillText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 11,
    color: '#EF4444',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 19,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  eventCountText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 12,
    color: '#94A3B8',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontFamily: 'Switzer-Regular',
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 12,
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  offlineBannerText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 11,
    color: '#92400E',
  },
});
