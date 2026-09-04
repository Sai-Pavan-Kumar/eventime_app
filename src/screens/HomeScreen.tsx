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
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { EventCard } from '../components/EventCard';
import { EmptyState } from '../components/EmptyState';
import { SmartRatingModal } from '../components/SmartRatingModal';
import { DelayedPromptModal } from '../components/DelayedPromptModal';
import { shouldShowRatingPrompt } from '../lib/rating-prompt';
import { APP_ASSETS } from '../lib/asset-registry';
import { parseEventDateString } from '../lib/utils/date';
import { getGuestPreferences, OnboardingData } from '../lib/guest-preferences';
import type { EventRow, RootStackParamList } from '../types';

const { width } = Dimensions.get('window');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// In-memory cache to prevent unnecessary refetching across tab switches
let homeEventsCache: {
  allEvents: EventRow[];
  timestamp: number;
} | null = null;

// In-memory cache for platform stats (15-minute TTL to guarantee 0 database bills)
let cachedPlatformStats: {
  data: {
    event_count: number;
    city_count: number;
    category_count: number;
    user_count: number;
  };
  timestamp: number;
} | null = null;

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
    setActiveTabIdx(idx);
    pagerRef.current?.scrollTo({ x: idx * width, animated: true });
  };

  const onMomentumScrollEnd = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const newIdx = Math.round(offsetX / width);
    if (newIdx >= 0 && newIdx < tabs.length && newIdx !== activeTabIdx) {
      setActiveTabIdx(newIdx);
    }
  };

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Calendar modal state
  const [showDateModal, setShowDateModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
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

  const [events, setEvents] = useState<EventRow[]>(homeEventsCache?.allEvents || []);
  const [campusEvents, setCampusEvents] = useState<EventRow[]>([]);
  const [savedEventIds, setSavedEventIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(!homeEventsCache);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pagination states
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const PAGE_SIZE = 15;

  // Platform stats for live ticker (Matching website parity)
  const [platformStats, setPlatformStats] = useState<{
    event_count: number;
    city_count: number;
    category_count: number;
    user_count: number;
  }>(
    cachedPlatformStats?.data || {
      event_count: 0,
      city_count: 12,
      category_count: 36,
      user_count: 0,
    }
  );

  const fetchPlatformStats = useCallback(async (forceRefresh: boolean = false) => {
    const now = Date.now();
    const FIFTEEN_MINUTES = 15 * 60 * 1000;

    // Use cache if fresh and not forced
    if (!forceRefresh && cachedPlatformStats && now - cachedPlatformStats.timestamp < FIFTEEN_MINUTES) {
      setPlatformStats(cachedPlatformStats.data);
      return;
    }

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
      cachedPlatformStats = { data: freshStats, timestamp: now };
      setPlatformStats(freshStats);
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
        setSavedEventIds(new Set(data.map((d) => d.event_id).filter(Boolean) as string[]));
      }
    } catch (e) {
      console.error('[HomeScreen] Saved events error:', e);
    }
  }, [user]);

  const fetchEvents = useCallback(async (pageIndex = 0, forceRefresh = false) => {
    try {
      if (pageIndex === 0 && !forceRefresh) setIsLoading(true);

      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // 1. Fetch public approved events (strictly exclude college-only events)
      let query = supabase
        .from('events')
        .select('*, colleges(name), profiles(username, full_name), interested_events(count)')
        .eq('status', 'approved')
        .or('college_only.is.null,college_only.eq.false')
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data, error } = await query;

      if (error) {
        console.error('[HomeScreen] Fetch events error:', error);
        return;
      }

      const rawEvents = (data as any[]) || [];
      
      if (rawEvents.length < PAGE_SIZE) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      setEvents((prev) => {
        const next = pageIndex === 0 ? rawEvents : [...prev, ...rawEvents];
        homeEventsCache = { allEvents: next, timestamp: Date.now() };
        return next;
      });

      // 2. If student, fetch their private campus events (only on first page load for simplicity, or handle similarly)
      if (pageIndex === 0 && user && profile?.user_type === 'student' && profile?.college_id) {
        const todayStr = new Date().toISOString().substring(0, 10);
        const { data: cEvents } = await supabase
          .from('events')
          .select('*, colleges(name), profiles(username, full_name), interested_events(count)')
          .eq('status', 'approved')
          .eq('college_id', profile.college_id)
          .gte('date_string', todayStr)
          .order('created_at', { ascending: false });

        if (cEvents) {
          setCampusEvents(cEvents as any[]);
        }
      }
    } catch (err) {
      console.error('[HomeScreen] Fetch error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsFetchingMore(false);
    }
  }, [user, profile]);

  const loadMoreEvents = () => {
    if (!hasMore || isFetchingMore || isLoading || isRefreshing) return;
    setIsFetchingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchEvents(nextPage);
  };

  useEffect(() => {
    if (!homeEventsCache) {
      setIsLoading(true);
    }
    setPage(0);
    setHasMore(true);
    fetchEvents(0);
    fetchSavedEventIds();
  }, [fetchEvents, fetchSavedEventIds]);

  const onRefresh = () => {
    setIsRefreshing(true);
    setPage(0);
    setHasMore(true);
    fetchEvents(0, true);
    fetchSavedEventIds();
    fetchPlatformStats();
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

    return events.filter((ev) => {
      const parsed = parseEventDateString(ev.date_string || '');
      if (!parsed) return true;
      const evDate = new Date(parsed);
      evDate.setHours(0, 0, 0, 0);
      return evDate.getTime() >= today.getTime();
    });
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

  // Calendar calculations
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return days;
  }, [calendarYear, calendarMonth]);

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const m = String(calendarMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    setSelectedDate(`${calendarYear}-${m}-${d}`);
    setShowDateModal(false);
  };

  const handleSelectToday = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
    setCalendarYear(y);
    setCalendarMonth(now.getMonth());
    setShowDateModal(false);
  };

  const handleClearDate = () => {
    setSelectedDate(null);
    setShowDateModal(false);
  };

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
              onPress={() => setShowDateModal(true)}
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
              onPress={() => navigation.navigate('Leaderboard')}
              activeOpacity={0.8}
            >
              <Trophy size={18} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Dynamic Time-of-Day Greeting for Everyone */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingText} numberOfLines={1} ellipsizeMode="tail">
            {getTimeOfDayGreeting(profile?.username?.trim().slice(0, 12) || profile?.full_name?.split(' ')[0]?.trim().slice(0, 12) || (user ? undefined : 'explorer'))}
          </Text>
        </View>

        {/* Live Stats Bar (Matching Website Parity) */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{platformStats.event_count || events.length || 0}</Text>
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

        {/* Tactile Segmented Track with Elevated Sliding Thumb */}
        <View style={styles.segmentedTrackContainer}>
          <View style={styles.segmentedTrack}>
            <Animated.View
              style={[
                styles.slidingThumb,
                {
                  width: tabWidth,
                  transform: [{ translateX }],
                },
              ]}
            />
            <View style={styles.segmentBtnsRow}>
              {tabs.map((tab, idx) => {
                const isActive = activeTabIdx === idx;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.segmentBtn, { width: tabWidth }]}
                    onPress={() => handleSelectTab(idx)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.segmentBtnText,
                        isActive && styles.segmentBtnTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* If Calendar Date is selected from top button, show an active date badge */}
        {selectedDate && (
          <View style={styles.activeDateBanner}>
            <Text style={styles.activeDateBannerText}>
              Showing events for {new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
            </Text>
            <TouchableOpacity onPress={() => setSelectedDate(null)} style={styles.clearActiveDateBtn}>
              <X size={14} color="#EF4444" />
              <Text style={styles.clearActiveDateBtnText}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Horizontally Swipeable Feeds Container */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.brand} />
        </View>
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
          )}
        </Animated.ScrollView>
      )}

      {/* Calendar Month Grid Modal */}
      {showDateModal && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowDateModal(false)}
          />
          <View style={styles.calendarModalContent}>
            {/* Modal Header */}
            <View style={styles.calendarModalHeader}>
              <View style={styles.monthSelector}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.monthNavBtn}>
                  <ChevronLeft size={20} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.monthYearText}>
                  {MONTH_NAMES[calendarMonth]} {calendarYear}
                </Text>
                <TouchableOpacity onPress={handleNextMonth} style={styles.monthNavBtn}>
                  <ChevronRight size={20} color="#0F172A" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowDateModal(false)}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Weekday Row */}
            <View style={styles.weekdayRow}>
              {WEEKDAY_NAMES.map((day, idx) => (
                <Text key={idx} style={styles.weekdayText}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.daysGrid}>
              {calendarDays.map((day, idx) => {
                if (day === null) {
                  return <View key={idx} style={styles.emptyDayCell} />;
                }

                const m = String(calendarMonth + 1).padStart(2, '0');
                const d = String(day).padStart(2, '0');
                const dateKey = `${calendarYear}-${m}-${d}`;
                const isSelected = selectedDate === dateKey;
                const hasEvents = eventDates.has(dateKey);

                const now = new Date();
                const isToday =
                  now.getFullYear() === calendarYear &&
                  now.getMonth() === calendarMonth &&
                  now.getDate() === day;

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.dayCell,
                      isSelected && styles.dayCellSelected,
                      isToday && !isSelected && styles.dayCellToday,
                    ]}
                    onPress={() => handleSelectDay(day)}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.dayTextSelected,
                        isToday && !isSelected && styles.dayTextToday,
                      ]}
                    >
                      {day}
                    </Text>
                    {hasEvents && !isSelected && <View style={styles.eventDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Modal Bottom Actions */}
            <View style={styles.calendarModalFooter}>
              <TouchableOpacity style={styles.todayBtn} onPress={handleSelectToday}>
                <Clock size={14} color="#6C47FF" />
                <Text style={styles.todayBtnText}>Today</Text>
              </TouchableOpacity>

              {selectedDate && (
                <TouchableOpacity style={styles.clearDateBtn} onPress={handleClearDate}>
                  <Text style={styles.clearDateBtnText}>Clear Date</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

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
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  calendarModalContent: {
    width: width - 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  calendarModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthYearText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    color: '#0F172A',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  weekdayText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: '#94A3B8',
    width: 36,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  emptyDayCell: {
    width: 36,
    height: 36,
    marginVertical: 4,
  },
  dayCell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
    position: 'relative',
  },
  dayCellSelected: {
    backgroundColor: '#6C47FF',
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: '#6C47FF',
  },
  dayText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 13,
    color: '#0F172A',
  },
  dayTextSelected: {
    fontFamily: 'Switzer-Bold',
    color: '#FFFFFF',
  },
  dayTextToday: {
    fontFamily: 'Switzer-Bold',
    color: '#6C47FF',
  },
  eventDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6C47FF',
  },
  calendarModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  todayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
  },
  todayBtnText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: '#6C47FF',
  },
  clearDateBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearDateBtnText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 12,
    color: '#EF4444',
  },
  activeDateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
  },
  activeDateBannerText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 13,
    color: '#6C47FF',
  },
  clearActiveDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  clearActiveDateBtnText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 11,
    color: '#EF4444',
  },
});
