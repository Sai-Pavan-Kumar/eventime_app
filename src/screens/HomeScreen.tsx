import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  MapPin,
  Compass,
  ChevronDown,
  Building2,
  Calendar as CalendarIcon,
  CalendarDays,
  Trophy,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  RotateCcw,
  Sparkles,
  GraduationCap,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { EventCard } from '../components/EventCard';
import { APP_ASSETS } from '../lib/asset-registry';
import { CATEGORIES_LIST } from '../lib/category-config';
import { CITIES } from '../lib/constants/cities';
import { parseEventDateString } from '../lib/utils/date';
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
  const userName = name || 'there';
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

  const isStudent = Boolean(user && profile?.user_type === 'student' && profile?.college_id);
  const hasGoals = Boolean(profile?.goals && profile.goals.length > 0);

  // Active Feed Pill: 'all' | 'for_you' | 'around_you' | 'campus'
  const [activeFeedPill, setActiveFeedPill] = useState<'all' | 'for_you' | 'around_you' | 'campus'>(
    hasGoals ? 'for_you' : 'all'
  );

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Calendar modal state
  const [showDateModal, setShowDateModal] = useState(false);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [eventDates, setEventDates] = useState<Set<string>>(new Set());

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

  // Filter Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);

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

      if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }

      if (selectedCity) {
        query = query.eq('city', selectedCity);
      }

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
  }, [selectedCategory, selectedCity, user, profile]);

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

  // Filtered Events based on Active Tab, Preferred Cities/Goals, and Calendar Date
  const displayedEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let source = events;

    // 1. Campus Feed
    if (activeFeedPill === 'campus') {
      source = campusEvents;
    }

    // 2. Filter by Date (Calendar vs Upcoming)
    let filtered = source.filter((ev) => {
      const parsed = parseEventDateString(ev.date_string || '');
      if (!parsed) return true;

      if (selectedDate) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const d = String(parsed.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}` === selectedDate;
      }

      // Default feed: Only today & upcoming events
      const evDate = new Date(parsed);
      evDate.setHours(0, 0, 0, 0);
      return evDate.getTime() >= today.getTime();
    });

    // 3. Apply Personalized Pill Filters (For You / Around You)
    if (!selectedDate && !selectedCategory && !selectedCity) {
      const preferredCities = profile?.preferred_cities || [];
      const preferredGoals = profile?.goals || [];

      if (activeFeedPill === 'for_you' && (preferredGoals.length > 0 || preferredCities.length > 0)) {
        const goalSet = new Set(preferredGoals);
        filtered = filtered.filter((e) => {
          const matchesCity = e.is_virtual || preferredCities.length === 0 || (e.city ? preferredCities.includes(e.city) : false);
          const matchesCategory = e.category ? goalSet.has(e.category) : false;
          return matchesCity && matchesCategory;
        });
      } else if (activeFeedPill === 'around_you' && preferredCities.length > 0) {
        filtered = filtered.filter((e) => {
          return e.is_virtual || (e.city ? preferredCities.includes(e.city) : false);
        });
      }
    }

    return filtered;
  }, [events, campusEvents, selectedDate, selectedCategory, selectedCity, activeFeedPill, profile]);

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

  const showPersonalizedPills = Boolean(user && profile?.is_onboarded && (hasGoals || isStudent));

  const renderHeader = () => (
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
            <Trophy size={18} color="#D97706" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dynamic Time-of-Day Greeting for Logged-In Users */}
      {user && (
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingText}>
            {getTimeOfDayGreeting(profile?.full_name?.split(' ')[0] || profile?.username || undefined)}
          </Text>
        </View>
      )}

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

      {/* Filter Chips Bar (Feed Pills, Category, City & Date Pickers) */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {/* Feed Pills: All / For You / Around You / Campus */}
          <TouchableOpacity
            style={[styles.feedPill, activeFeedPill === 'all' && !selectedDate && styles.feedPillActive]}
            onPress={() => {
              setActiveFeedPill('all');
              setSelectedDate(null);
            }}
          >
            <Compass size={14} color={activeFeedPill === 'all' && !selectedDate ? '#FFF' : '#64748B'} />
            <Text style={[styles.feedPillText, activeFeedPill === 'all' && !selectedDate && styles.feedPillTextActive]}>
              Explore All
            </Text>
          </TouchableOpacity>

          {showPersonalizedPills && (
            <>
              <TouchableOpacity
                style={[styles.feedPill, activeFeedPill === 'for_you' && !selectedDate && styles.feedPillActive]}
                onPress={() => {
                  setActiveFeedPill('for_you');
                  setSelectedDate(null);
                }}
              >
                <Text style={[styles.feedPillText, activeFeedPill === 'for_you' && !selectedDate && styles.feedPillTextActive]}>
                  For You
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.feedPill, activeFeedPill === 'around_you' && !selectedDate && styles.feedPillActive]}
                onPress={() => {
                  setActiveFeedPill('around_you');
                  setSelectedDate(null);
                }}
              >
                <Text style={[styles.feedPillText, activeFeedPill === 'around_you' && !selectedDate && styles.feedPillTextActive]}>
                  Around You
                </Text>
              </TouchableOpacity>

              {isStudent && (
                <TouchableOpacity
                  style={[styles.feedPill, activeFeedPill === 'campus' && !selectedDate && styles.feedPillActive]}
                  onPress={() => {
                    setActiveFeedPill('campus');
                    setSelectedDate(null);
                  }}
                >
                  <GraduationCap size={14} color={activeFeedPill === 'campus' && !selectedDate ? '#FFF' : '#64748B'} />
                  <Text style={[styles.feedPillText, activeFeedPill === 'campus' && !selectedDate && styles.feedPillTextActive]}>
                    Campus ({campusEvents.length})
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Calendar Date Filter */}
          <TouchableOpacity
            style={[styles.filterPill, Boolean(selectedDate) && styles.filterPillSelected]}
            onPress={() => setShowDateModal(true)}
          >
            <CalendarIcon size={13} color={selectedDate ? '#6C47FF' : '#64748B'} />
            <Text style={[styles.filterPillText, Boolean(selectedDate) && styles.filterPillTextSelected]}>
              {selectedDate
                ? new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
                : 'Calendar'}
            </Text>
            <ChevronDown size={14} color={selectedDate ? '#6C47FF' : '#64748B'} />
          </TouchableOpacity>

          {/* Category Dropdown Filter */}
          <TouchableOpacity
            style={[styles.filterPill, Boolean(selectedCategory) && styles.filterPillSelected]}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={[styles.filterPillText, Boolean(selectedCategory) && styles.filterPillTextSelected]}>
              {selectedCategory || 'Categories'}
            </Text>
            <ChevronDown size={14} color={selectedCategory ? '#6C47FF' : '#64748B'} />
          </TouchableOpacity>

          {/* City Dropdown Filter */}
          <TouchableOpacity
            style={[styles.filterPill, Boolean(selectedCity) && styles.filterPillSelected]}
            onPress={() => setShowCityModal(true)}
          >
            <MapPin size={13} color={selectedCity ? '#6C47FF' : '#64748B'} />
            <Text style={[styles.filterPillText, Boolean(selectedCity) && styles.filterPillTextSelected]}>
              {selectedCity || 'Cities'}
            </Text>
            <ChevronDown size={14} color={selectedCity ? '#6C47FF' : '#64748B'} />
          </TouchableOpacity>

          {/* Clear Filter Button if active */}
          {(selectedCategory || selectedCity || selectedDate) && (
            <TouchableOpacity
              style={styles.clearPill}
              onPress={() => {
                setSelectedCategory(null);
                setSelectedCity(null);
                setSelectedDate(null);
              }}
            >
              <RotateCcw size={12} color="#EF4444" />
              <Text style={styles.clearPillText}>Reset</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {selectedCategory && selectedCity
            ? `${selectedCategory}s in ${selectedCity}`
            : selectedCategory
            ? `${selectedCategory} Events`
            : selectedCity
            ? `Events in ${selectedCity}`
            : selectedDate
            ? `Events on ${new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`
            : activeFeedPill === 'campus'
            ? 'Campus Events'
            : activeFeedPill === 'for_you'
            ? 'For You'
            : activeFeedPill === 'around_you'
            ? 'Around You'
            : "What's happening"}
        </Text>
        <Text style={styles.eventCountText}>{displayedEvents.length} events</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.brand} />
        </View>
      ) : (
        <FlatList
          data={displayedEvents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
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
          )}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No events found</Text>
              <Text style={styles.emptySubtitle}>
                {selectedDate
                  ? 'No events scheduled for this date.'
                  : activeFeedPill === 'campus'
                  ? 'No private campus events currently listed.'
                  : 'Try exploring other categories or dates.'}
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.brand]}
              tintColor={theme.colors.brand}
            />
          }
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
      )}

      {/* Calendar Month Grid Modal */}
      {showDateModal && (
        <View style={styles.modalOverlay}>
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

      {/* Category Modal */}
      {showCategoryModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <X size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.modalItem, !selectedCategory && styles.modalItemSelected]}
                onPress={() => {
                  setSelectedCategory(null);
                  setShowCategoryModal(false);
                }}
              >
                <Text style={[styles.modalItemText, !selectedCategory && styles.modalItemTextSelected]}>
                  All Categories
                </Text>
              </TouchableOpacity>
              {CATEGORIES_LIST.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.modalItem, selectedCategory === cat && styles.modalItemSelected]}
                  onPress={() => {
                    setSelectedCategory(cat);
                    setShowCategoryModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      selectedCategory === cat && styles.modalItemTextSelected,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* City Modal */}
      {showCityModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select City</Text>
              <TouchableOpacity onPress={() => setShowCityModal(false)}>
                <X size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.modalItem, !selectedCity && styles.modalItemSelected]}
                onPress={() => {
                  setSelectedCity(null);
                  setShowCityModal(false);
                }}
              >
                <Text style={[styles.modalItemText, !selectedCity && styles.modalItemTextSelected]}>
                  Anywhere
                </Text>
              </TouchableOpacity>
              {CITIES.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={[styles.modalItem, selectedCity === city && styles.modalItemSelected]}
                  onPress={() => {
                    setSelectedCity(city);
                    setShowCityModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      selectedCity === city && styles.modalItemTextSelected,
                    ]}
                  >
                    {city}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
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
  headerContainer: {
    paddingBottom: 8,
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
    fontSize: 20,
    fontWeight: '900',
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
    fontSize: 12,
    fontWeight: '700',
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
    fontSize: 13,
    fontWeight: '700',
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
    fontSize: 14,
    fontWeight: '900',
    color: '#6C47FF',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#E2E8F0',
  },
  filterBar: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  feedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  feedPillActive: {
    backgroundColor: '#0F172A',
  },
  feedPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  feedPillTextActive: {
    color: '#FFFFFF',
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
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterPillTextSelected: {
    color: '#6C47FF',
    fontWeight: '700',
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
    fontSize: 11,
    fontWeight: '700',
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
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  eventCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySubtitle: {
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
    fontSize: 15,
    fontWeight: '800',
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
    fontSize: 12,
    fontWeight: '700',
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
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dayTextToday: {
    color: '#6C47FF',
    fontWeight: '700',
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
    fontSize: 12,
    fontWeight: '700',
    color: '#6C47FF',
  },
  clearDateBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearDateBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  modalContent: {
    width: width - 48,
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalList: {
    marginTop: 8,
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  modalItemSelected: {
    backgroundColor: '#EDE9FE',
  },
  modalItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  modalItemTextSelected: {
    color: '#6C47FF',
    fontWeight: '800',
  },
});
