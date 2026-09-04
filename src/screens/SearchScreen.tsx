import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { SelectPickerModal } from '../components/SelectPickerModal';
import { CATEGORIES_LIST } from '../lib/category-config';
import { CITIES } from '../lib/constants/cities';
import { APP_ASSETS } from '../lib/asset-registry';
import { parseEventDateString } from '../lib/utils/date';
import { useAuth } from '../context/AuthContext';
import type { EventRow, RootStackParamList } from '../types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();

  const [keyword, setKeyword] = useState('');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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

  // Calendar State (Matching HomeScreen parity)
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());

  const [allEvents, setAllEvents] = useState<EventRow[]>([]);
  const [savedEventIds, setSavedEventIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch all approved events with relations
  const fetchAllEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*, colleges(name), profiles(username, full_name), interested_events(count)')
        .eq('status', 'approved')
        .or('college_only.is.null,college_only.eq.false')
        .order('created_at', { ascending: false });

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
      let isUpcomingOrToday = true;
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

  // Calendar calculations (HomeScreen parity)
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
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
    const dateKey = `${calendarYear}-${m}-${d}`;
    if (selectedDate === dateKey) {
      setSelectedDate(null);
    } else {
      setSelectedDate(dateKey);
    }
    setShowDateModal(false);
  };

  const handleSelectToday = () => {
    const now = new Date();
    setCalendarYear(now.getFullYear());
    setCalendarMonth(now.getMonth());
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    setSelectedDate(`${now.getFullYear()}-${m}-${d}`);
    setShowDateModal(false);
  };

  const handleClearDate = () => {
    setSelectedDate(null);
    setShowDateModal(false);
  };

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
        if (!parsed) return true;
        const evDate = new Date(parsed);
        evDate.setHours(0, 0, 0, 0);
        return evDate.getTime() >= today.getTime();
      });
    }

    // 2. Keyword search (Event title, category, city, location, organizer, college, curator username/name, description)
    if (keyword.trim()) {
      const q = keyword.trim().toLowerCase();
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
  }, [allEvents, keyword, selectedCity, selectedCategory, selectedDate]);

  const clearAllFilters = () => {
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
      {/* Search Bar Header */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            style={styles.input}
            placeholder="Search events, categories, cities, curators..."
            placeholderTextColor="#94A3B8"
            value={keyword}
            onChangeText={setKeyword}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {keyword.length > 0 && (
            <TouchableOpacity onPress={() => setKeyword('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips Horizontal Scroll: Calendar | City | Category | Price */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {/* 1. Calendar Date Button (HomeScreen Parity) */}
          <TouchableOpacity
            style={[styles.dropdownChip, Boolean(selectedDate) && styles.chipActive]}
            onPress={() => setShowDateModal(true)}
            activeOpacity={0.8}
          >
            <CalendarDays size={14} color={selectedDate ? '#FFF' : '#6C47FF'} />
            <Text style={[styles.chipText, Boolean(selectedDate) && styles.chipTextActive]}>
              {selectedDate
                ? new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
                : 'Date'}
            </Text>
          </TouchableOpacity>

          {/* 2. Today Filter */}
          <TouchableOpacity
            style={[styles.chip, selectedDate === getTodayStr() && styles.chipActive]}
            onPress={() => {
              const todayStr = getTodayStr();
              setSelectedDate((prev) => (prev === todayStr ? null : todayStr));
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, selectedDate === getTodayStr() && styles.chipTextActive]}>
              Today
            </Text>
          </TouchableOpacity>

          {/* 3. Tomorrow Filter */}
          <TouchableOpacity
            style={[styles.chip, selectedDate === getTomorrowStr() && styles.chipActive]}
            onPress={() => {
              const tomorrowStr = getTomorrowStr();
              setSelectedDate((prev) => (prev === tomorrowStr ? null : tomorrowStr));
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, selectedDate === getTomorrowStr() && styles.chipTextActive]}>
              Tomorrow
            </Text>
          </TouchableOpacity>

          {/* 4. City Dropdown */}
          <TouchableOpacity
            style={[styles.dropdownChip, selectedCity && styles.chipActive]}
            onPress={() => setShowCityModal(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, selectedCity && styles.chipTextActive]}>
              {selectedCity
                ? `${selectedCity}${cityCounts[selectedCity] !== undefined ? ` (${cityCounts[selectedCity]})` : ''}`
                : 'City'}
            </Text>
            <ChevronDown size={14} color={selectedCity ? '#FFF' : '#64748B'} />
          </TouchableOpacity>

          {/* 5. Category Dropdown */}
          <TouchableOpacity
            style={[styles.dropdownChip, selectedCategory && styles.chipActive]}
            onPress={() => setShowCategoryModal(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, selectedCategory && styles.chipTextActive]}>
              {selectedCategory
                ? `${selectedCategory}${categoryCounts[selectedCategory] !== undefined ? ` (${categoryCounts[selectedCategory]})` : ''}`
                : 'Category'}
            </Text>
            <ChevronDown size={14} color={selectedCategory ? '#FFF' : '#64748B'} />
          </TouchableOpacity>

          {/* Clear Button if any filter is active */}
          {hasActiveFilters && (
            <TouchableOpacity style={styles.clearChip} onPress={clearAllFilters} activeOpacity={0.8}>
              <X size={12} color="#EF4444" />
              <Text style={styles.clearChipText}>Reset</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Active Calendar Date Banner (Identical to HomeScreen) */}
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

      {/* Results / Content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6C47FF" />
          <Text style={styles.loadingText}>Searching events...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
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

      {/* Calendar Month Grid Modal (HomeScreen Parity) */}
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
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 999,
  },
  calendarModalContent: {
    width: '100%',
    maxWidth: 360,
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
