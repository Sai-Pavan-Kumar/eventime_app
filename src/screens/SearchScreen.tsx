import React, { useState, useEffect, useCallback, useMemo, useDeferredValue } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Search,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { EventCard } from '../components/EventCard';
import { FeedSkeleton } from '../components/EventCardSkeleton';
import { withTimeout } from '../lib/api-resilience';
import { SelectPickerModal } from '../components/SelectPickerModal';
import { CATEGORIES_LIST } from '../lib/category-config';
import { CITIES } from '../lib/constants/cities';
import { APP_ASSETS } from '../lib/asset-registry';
import { parseEventDateString } from '../lib/utils/date';
import { useAuth } from '../context/AuthContext';
import { haptic } from '../lib/haptics';
import { SearchBar } from '../components/search/SearchBar';
import { SearchFilterRow } from '../components/search/SearchFilterRow';
import { HomeActiveDateBanner } from '../components/home/HomeActiveDateBanner';
import { CalendarPickerModal } from '../components/CalendarPickerModal';
import type { EventRow, RootStackParamList } from '../types';

export default function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();

  const [keyword, setKeyword] = useState('');
  const deferredKeyword = useDeferredValue(keyword);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(15);

  const getTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getTomorrowStr = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const d = String(tomorrow.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);

  const [allEvents, setAllEvents] = useState<EventRow[]>([]);
  const [savedEventIds, setSavedEventIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch all approved events with relations
  const fetchAllEvents = useCallback(async () => {
    try {
      const query = supabase
        .from('events')
        .select('*, colleges(name), profiles(username, full_name), interested_events(count)')
        .eq('status', 'approved')
        .or('college_only.is.null,college_only.eq.false')
        .order('created_at', { ascending: false });

      const { data, error } = await withTimeout(query, 8000);

      if (error) throw error;
      setAllEvents((data as any[]) || []);
    } catch (err) {
      console.error('[SearchScreen] Fetch events error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const fetchSavedEventIds = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('saved_events')
        .select('event_id')
        .eq('user_id', user.id);
      if (data) {
        setSavedEventIds(new Set(data.map((d) => d.event_id).filter(Boolean) as string[]));
      }
    } catch (e) {
      console.error('[SearchScreen] Saved events error:', e);
    }
  }, [user]);

  useEffect(() => {
    fetchAllEvents();
    fetchSavedEventIds();
  }, [fetchAllEvents, fetchSavedEventIds]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchAllEvents();
    fetchSavedEventIds();
  };

  // Category and City counts across upcoming platform events (Today + Future)
  const { categoryCounts, cityCounts, eventDates } = useMemo(() => {
    const catMap: Record<string, number> = {};
    const cityMap: Record<string, number> = {};
    const datesSet = new Set<string>();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    allEvents.forEach((row: any) => {
      const parsed = parseEventDateString(row.date_string || '');
      let isUpcomingOrToday = false;
      if (parsed) {
        const evDate = new Date(parsed);
        evDate.setHours(0, 0, 0, 0);
        isUpcomingOrToday = evDate.getTime() >= today.getTime();
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const d = String(parsed.getDate()).padStart(2, '0');
        datesSet.add(`${y}-${m}-${d}`);
      }

      if (isUpcomingOrToday) {
        if (row.category) {
          catMap[row.category] = (catMap[row.category] || 0) + 1;
        }
        if (row.city) {
          cityMap[row.city] = (cityMap[row.city] || 0) + 1;
        }
      }
    });

    return { categoryCounts: catMap, cityCounts: cityMap, eventDates: datesSet };
  }, [allEvents]);

  // Comprehensive multi-field search and filtering
  const filteredEvents = useMemo(() => {
    let pool = [...allEvents];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. By default, strictly exclude past events (Matches HomeScreen parity)
    // Only show past events if the user explicitly picked a past date via calendar
    if (!selectedDate) {
      pool = pool.filter((ev) => {
        const parsed = parseEventDateString(ev.date_string || '');
        if (!parsed) return false;
        const evDate = new Date(parsed);
        evDate.setHours(0, 0, 0, 0);
        return evDate.getTime() >= today.getTime();
      });
    }

    // 2. Keyword search (Event title, category, city, location, organizer, college, curator username/name, description)
    if (deferredKeyword.trim()) {
      const q = deferredKeyword.trim().toLowerCase();
      pool = pool.filter((ev: any) => {
        const title = (ev.title || '').toLowerCase();
        const category = (ev.category || '').toLowerCase();
        const city = (ev.city || '').toLowerCase();
        const location = (ev.location || '').toLowerCase();
        const organizer = (ev.organizer_name || '').toLowerCase();
        const college = (ev.colleges?.name || '').toLowerCase();
        const curatorUsername = (ev.profiles?.username || '').toLowerCase();
        const curatorName = (ev.profiles?.full_name || '').toLowerCase();
        const description = (ev.description || '').toLowerCase();

        return (
          title.includes(q) ||
          category.includes(q) ||
          city.includes(q) ||
          location.includes(q) ||
          organizer.includes(q) ||
          college.includes(q) ||
          curatorUsername.includes(q) ||
          curatorName.includes(q) ||
          description.includes(q)
        );
      });
    }

    // 3. City Filter
    if (selectedCity) {
      const targetCity = selectedCity.toLowerCase().trim();
      pool = pool.filter((ev) => ev.city?.toLowerCase().trim() === targetCity);
    }

    // 4. Category Filter
    if (selectedCategory) {
      const targetCat = selectedCategory.toLowerCase().trim();
      pool = pool.filter((ev) => ev.category?.toLowerCase().trim() === targetCat);
    }

    // 5. Calendar Date Filter (Matches specific date)
    if (selectedDate) {
      pool = pool.filter((ev) => {
        const parsed = parseEventDateString(ev.date_string || '');
        if (!parsed) return false;
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const d = String(parsed.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}` === selectedDate;
      });
    }

    // Sort chronologically (earliest upcoming first)
    pool.sort((a, b) => {
      const da = parseEventDateString(a.date_string)?.getTime() || 0;
      const db = parseEventDateString(b.date_string)?.getTime() || 0;
      return da - db;
    });

    return pool;
  }, [allEvents, deferredKeyword, selectedCity, selectedCategory, selectedDate]);

  // Reset displayLimit to 15 whenever any filter or search query changes
  useEffect(() => {
    setDisplayLimit(15);
  }, [deferredKeyword, selectedCity, selectedCategory, selectedDate]);

  // Virtualized progressive slice of events for peak scroll fluidity
  const visibleEvents = useMemo(() => {
    return filteredEvents.slice(0, displayLimit);
  }, [filteredEvents, displayLimit]);

  const handleLoadMore = () => {
    if (displayLimit < filteredEvents.length) {
      setDisplayLimit((prev) => prev + 15);
    }
  };

  const clearAllFilters = () => {
    haptic.light();
    setKeyword('');
    setSelectedCity(null);
    setSelectedCategory(null);
    setSelectedDate(null);
  };

  const hasActiveFilters = Boolean(
    keyword.trim() || selectedCity || selectedCategory || selectedDate
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Bar & Filter Header */}
      <View style={styles.header}>
        <SearchBar
          keyword={keyword}
          onChangeKeyword={setKeyword}
          onClear={() => setKeyword('')}
        />

        <SearchFilterRow
          selectedDate={selectedDate}
          onOpenDateModal={() => setShowDateModal(true)}
          onToggleToday={() => {
            const todayStr = getTodayStr();
            setSelectedDate((prev) => (prev === todayStr ? null : todayStr));
          }}
          isTodayActive={selectedDate === getTodayStr()}
          onToggleTomorrow={() => {
            const tomorrowStr = getTomorrowStr();
            setSelectedDate((prev) => (prev === tomorrowStr ? null : tomorrowStr));
          }}
          isTomorrowActive={selectedDate === getTomorrowStr()}
          selectedCity={selectedCity}
          cityCounts={cityCounts}
          onOpenCityModal={() => setShowCityModal(true)}
          selectedCategory={selectedCategory}
          categoryCounts={categoryCounts}
          onOpenCategoryModal={() => setShowCategoryModal(true)}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={clearAllFilters}
        />
      </View>

      {/* Active Calendar Date Banner */}
      {selectedDate && (
        <HomeActiveDateBanner
          selectedDate={selectedDate}
          onClearDate={() => setSelectedDate(null)}
        />
      )}

      {/* Results / Content */}
      {isLoading ? (
        <FeedSkeleton count={4} />
      ) : (
        <FlatList
          data={visibleEvents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          updateCellsBatchingPeriod={50}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            displayLimit < filteredEvents.length ? (
              <View style={{ paddingVertical: 18, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#6C47FF" />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#6C47FF"
              colors={['#6C47FF']}
            />
          }
          renderItem={({ item }) => (
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
              onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
              onSaveToggle={(id, saved) => {
                setSavedEventIds((prev) => {
                  const next = new Set(prev);
                  if (saved) next.add(id);
                  else next.delete(id);
                  return next;
                });
              }}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Image
                source={APP_ASSETS.illustrations.search}
                style={styles.emptyIllustration}
                contentFit="contain"
              />
              <Text style={styles.emptyTitle}>No matching events found</Text>
              <Text style={styles.emptySubtitle}>
                Try searching for a different keyword, category, city, or curator name.
              </Text>
              {hasActiveFilters && (
                <TouchableOpacity style={styles.resetBtn} onPress={clearAllFilters}>
                  <Text style={styles.resetBtnText}>Clear All Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Category Picker Modal */}
      <SelectPickerModal
        visible={showCategoryModal}
        title="Select Category"
        items={CATEGORIES_LIST}
        selectedItem={selectedCategory}
        itemCounts={categoryCounts}
        onSelect={(cat) => setSelectedCategory(cat)}
        onClose={() => setShowCategoryModal(false)}
        allowClear
        clearLabel="All Categories"
        onClear={() => setSelectedCategory(null)}
        searchPlaceholder="Search categories..."
      />

      {/* City Picker Modal */}
      <SelectPickerModal
        visible={showCityModal}
        title="Select City"
        items={CITIES}
        selectedItem={selectedCity}
        itemCounts={cityCounts}
        onSelect={(c) => setSelectedCity(c)}
        onClose={() => setShowCityModal(false)}
        allowClear
        clearLabel="All Cities"
        onClear={() => setSelectedCity(null)}
        searchPlaceholder="Search Indian cities..."
      />

      {/* Shared Calendar Month Grid Modal */}
      <CalendarPickerModal
        visible={showDateModal}
        selectedDate={selectedDate}
        eventDates={eventDates}
        onSelectDate={(dateStr) => setSelectedDate(dateStr)}
        onClearDate={() => setSelectedDate(null)}
        onClose={() => setShowDateModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Switzer-Medium',
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontFamily: 'Switzer-Medium',
    fontSize: 15,
    color: '#0F172A',
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#6C47FF',
    borderColor: '#6C47FF',
  },
  chipText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  dropdownChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  clearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 100,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  clearChipText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: '#EF4444',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 50,
  },
  emptyIllustration: {
    width: 220,
    height: 160,
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 19,
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Switzer-Regular',
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  resetBtn: {
    backgroundColor: '#6C47FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 100,
  },
  resetBtnText: {
    fontFamily: 'Switzer-Bold',
    color: '#FFFFFF',
    fontSize: 13,
  },
});
