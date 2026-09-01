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
  Search,
  Filter,
  ChevronDown,
  Building2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  RotateCcw,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { EventCard } from '../components/EventCard';
import { APP_ASSETS, getCityImage } from '../lib/asset-registry';
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

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, profile } = useAuth();

  const [activeTab, setActiveTab] = useState<'all' | 'forYou'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Calendar modal state
  const [showDateModal, setShowDateModal] = useState(false);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [eventDates, setEventDates] = useState<Set<string>>(new Set());

  const [events, setEvents] = useState<EventRow[]>([]);
  const [savedEventIds, setSavedEventIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);

  // Fetch all distinct event dates to show dot indicators in the calendar
  useEffect(() => {
    supabase
      .from('events')
      .select('date_string')
      .eq('status', 'approved')
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
  }, []);

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

  const fetchEvents = useCallback(async () => {
    try {
      let query = supabase
        .from('events')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

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

      const rawEvents = data || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Filtering Logic:
      // 1. If a specific calendar date is selected, filter specifically for that date (even if past).
      // 2. If no calendar date is selected, exclude past events from upcoming feed.
      let filtered = rawEvents.filter((ev) => {
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

      if (activeTab === 'forYou' && !selectedDate) {
        const preferredCities = profile?.preferred_cities || [];
        const preferredGoals = profile?.goals || [];

        if (preferredCities.length > 0 || preferredGoals.length > 0) {
          const personalized = filtered.filter((ev) => {
            const matchesCity = ev.city && preferredCities.includes(ev.city);
            const matchesCategory = ev.category && preferredGoals.includes(ev.category);
            const isVirtual = ev.is_virtual === true;
            return matchesCity || matchesCategory || isVirtual;
          });
          setEvents(personalized.length > 0 ? personalized : filtered);
        } else {
          setEvents(filtered);
        }
      } else {
        setEvents(filtered);
      }
    } catch (err) {
      console.error('[HomeScreen] Fetch error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedCategory, selectedCity, selectedDate, activeTab, profile]);

  useEffect(() => {
    setIsLoading(true);
    fetchEvents();
    fetchSavedEventIds();
  }, [fetchEvents, fetchSavedEventIds]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchEvents();
    fetchSavedEventIds();
  };

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
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => (navigation as any).navigate('SearchTab')}
            activeOpacity={0.8}
          >
            <Search size={20} color="#0F172A" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => (navigation as any).navigate('CitiesTab')}
            activeOpacity={0.8}
          >
            <Building2 size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero Banner Section */}
      <View style={styles.heroSection}>
        <View style={styles.heroTextContent}>
          <Text style={styles.heroBadge}>DISCOVER & EXPERIENCE</Text>
          <Text style={styles.heroTitle}>The Dictionary for Events.</Text>
          <Text style={styles.heroSubtitle}>
            Tech, Cultural, College & Professional events curated across India.
          </Text>
        </View>
        <Image
          source={APP_ASSETS.heroBanner}
          style={styles.heroImage}
          contentFit="contain"
        />
      </View>

      {/* Filter Chips Bar (Category, City & Date Pickers) */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {/* Feed Tabs: All vs For You */}
          <TouchableOpacity
            style={[styles.feedPill, activeTab === 'all' && !selectedDate && styles.feedPillActive]}
            onPress={() => {
              setActiveTab('all');
              setSelectedDate(null);
            }}
          >
            <Compass size={14} color={activeTab === 'all' && !selectedDate ? '#FFF' : '#64748B'} />
            <Text style={[styles.feedPillText, activeTab === 'all' && !selectedDate && styles.feedPillTextActive]}>
              Explore All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.feedPill, activeTab === 'forYou' && !selectedDate && styles.feedPillActive]}
            onPress={() => {
              setActiveTab('forYou');
              setSelectedDate(null);
            }}
          >
            <Text style={[styles.feedPillText, activeTab === 'forYou' && !selectedDate && styles.feedPillTextActive]}>
              For You
            </Text>
          </TouchableOpacity>

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
          {selectedDate
            ? `Events on ${new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`
            : activeTab === 'forYou'
            ? 'Recommended For You'
            : 'Upcoming Events'}
        </Text>
        <Text style={styles.sectionCount}>
          {events.length} {events.length === 1 ? 'event' : 'events'}
        </Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Image
        source={APP_ASSETS.illustrations.empty}
        style={styles.emptyIllustration}
        contentFit="contain"
      />
      <Text style={styles.emptyTitle}>
        {selectedDate ? 'No events on this date' : 'The stage is waiting!'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {selectedDate
          ? 'There were no events hosted on this specific date. Try selecting another date from the calendar.'
          : selectedCategory || selectedCity
          ? 'No events match the selected filters right now. Try resetting filters or exploring other categories.'
          : 'No upcoming events found. Be the first to host an event on EvenTime!'}
      </Text>
      <TouchableOpacity
        style={styles.createEventBtn}
        onPress={() => (navigation as any).navigate('CreateTab')}
        activeOpacity={0.85}
      >
        <Text style={styles.createEventBtnText}>Host An Event</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#6C47FF" />
          <Text style={styles.loaderText}>Loading live events...</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <EventCard
                event={item}
                isSaved={savedEventIds.has(item.id)}
                onPress={() =>
                  navigation.navigate('EventDetail', {
                    id: item.id,
                    eventId: item.id,
                    slug: item.slug || item.id,
                  })
                }
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
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#6C47FF"
              colors={['#6C47FF']}
            />
          }
        />
      )}

      {/* CALENDAR DATE PICKER MODAL */}
      {showDateModal && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowDateModal(false)}
          />
          <View style={styles.calendarModalSheet}>
            {/* Header */}
            <View style={styles.calendarModalHeader}>
              <View style={styles.monthNavRow}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.monthNavBtn}>
                  <ChevronLeft size={20} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.calendarMonthTitle}>
                  {MONTH_NAMES[calendarMonth]} {calendarYear}
                </Text>
                <TouchableOpacity onPress={handleNextMonth} style={styles.monthNavBtn}>
                  <ChevronRight size={20} color="#0F172A" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => setShowDateModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Weekdays Header */}
            <View style={styles.weekdaysRow}>
              {WEEKDAY_NAMES.map((w, idx) => (
                <Text key={idx} style={styles.weekdayLabel}>
                  {w}
                </Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.daysGrid}>
              {calendarDays.map((day, idx) => {
                if (day === null) {
                  return <View key={`empty-${idx}`} style={styles.dayCellEmpty} />;
                }

                const mStr = String(calendarMonth + 1).padStart(2, '0');
                const dStr = String(day).padStart(2, '0');
                const cellDateStr = `${calendarYear}-${mStr}-${dStr}`;

                const isSelected = selectedDate === cellDateStr;
                const hasEvents = eventDates.has(cellDateStr);

                const todayObj = new Date();
                const isToday =
                  todayObj.getFullYear() === calendarYear &&
                  todayObj.getMonth() === calendarMonth &&
                  todayObj.getDate() === day;

                return (
                  <TouchableOpacity
                    key={`day-${day}`}
                    style={[
                      styles.dayCell,
                      isToday && styles.dayCellToday,
                      isSelected && styles.dayCellSelected,
                    ]}
                    onPress={() => handleSelectDay(day)}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isToday && styles.dayTextToday,
                        isSelected && styles.dayTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                    {hasEvents && !isSelected && <View style={styles.eventDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quick Actions Footer */}
            <View style={styles.calendarFooter}>
              <TouchableOpacity
                style={styles.calendarFooterBtnSecondary}
                onPress={handleSelectToday}
              >
                <Text style={styles.calendarFooterBtnSecondaryText}>Today</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.calendarFooterBtnPrimary}
                onPress={handleClearDate}
              >
                <Text style={styles.calendarFooterBtnPrimaryText}>All Dates (Upcoming)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* CATEGORY PICKER MODAL */}
      {showCategoryModal && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowCategoryModal(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  selectedCategory === null && styles.modalItemActive,
                ]}
                onPress={() => {
                  setSelectedCategory(null);
                  setShowCategoryModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    selectedCategory === null && styles.modalItemTextActive,
                  ]}
                >
                  All Categories
                </Text>
              </TouchableOpacity>
              {CATEGORIES_LIST.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.modalItem,
                    selectedCategory === cat && styles.modalItemActive,
                  ]}
                  onPress={() => {
                    setSelectedCategory(cat);
                    setShowCategoryModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      selectedCategory === cat && styles.modalItemTextActive,
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

      {/* CITY PICKER MODAL */}
      {showCityModal && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowCityModal(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by City</Text>
              <TouchableOpacity onPress={() => setShowCityModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  selectedCity === null && styles.modalItemActive,
                ]}
                onPress={() => {
                  setSelectedCity(null);
                  setShowCityModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    selectedCity === null && styles.modalItemTextActive,
                  ]}
                >
                  All Cities (India & Online)
                </Text>
              </TouchableOpacity>
              {CITIES.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={[
                    styles.modalItem,
                    selectedCity === city && styles.modalItemActive,
                  ]}
                  onPress={() => {
                    setSelectedCity(city);
                    setShowCityModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      selectedCity === city && styles.modalItemTextActive,
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
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    paddingBottom: 100,
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogo: {
    width: 130,
    height: 34,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    alignItems: 'center',
  },
  heroTextContent: {
    alignItems: 'center',
    marginBottom: 12,
  },
  heroBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6C47FF',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  heroImage: {
    width: width - 32,
    height: 170,
    borderRadius: 16,
  },
  filterBar: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  feedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  feedPillActive: {
    backgroundColor: '#6C47FF',
    borderColor: '#6C47FF',
  },
  feedPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  feedPillTextActive: {
    color: '#FFFFFF',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillSelected: {
    borderColor: '#6C47FF',
    backgroundColor: '#EEF2FF',
  },
  filterPillText: {
    fontSize: 13,
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
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: '#FEE2E2',
  },
  clearPillText: {
    fontSize: 12,
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
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  cardWrapper: {
    paddingHorizontal: 16,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 30,
    paddingBottom: 60,
  },
  emptyIllustration: {
    width: 220,
    height: 160,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  createEventBtn: {
    backgroundColor: '#6C47FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 100,
  },
  createEventBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '70%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalList: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  modalItemActive: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  modalItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  modalItemTextActive: {
    color: '#6C47FF',
    fontWeight: '800',
  },
  calendarModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
  },
  calendarModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 6,
  },
  weekdayLabel: {
    width: (width - 52) / 7,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  dayCellEmpty: {
    width: (width - 40) / 7,
    height: 40,
  },
  dayCell: {
    width: (width - 40) / 7,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    position: 'relative',
  },
  dayCellToday: {
    backgroundColor: '#F1F5F9',
  },
  dayCellSelected: {
    backgroundColor: '#6C47FF',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  dayTextToday: {
    color: '#6C47FF',
    fontWeight: '800',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  eventDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6C47FF',
  },
  calendarFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  calendarFooterBtnSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    backgroundColor: '#F1F5F9',
  },
  calendarFooterBtnSecondaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  calendarFooterBtnPrimary: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 100,
    backgroundColor: '#6C47FF',
    alignItems: 'center',
  },
  calendarFooterBtnPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
