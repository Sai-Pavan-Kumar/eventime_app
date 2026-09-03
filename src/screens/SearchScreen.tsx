import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Search, X, MapPin, ChevronDown, Calendar } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { EventCard } from '../components/EventCard';
import { SelectPickerModal } from '../components/SelectPickerModal';
import { DatePickerModal } from '../components/DatePickerModal';
import { CATEGORIES_LIST } from '../lib/category-config';
import { CITIES } from '../lib/constants/cities';
import { APP_ASSETS } from '../lib/asset-registry';
import { parseEventDateString } from '../lib/utils/date';
import { useAuth } from '../context/AuthContext';
import type { EventRow, RootStackParamList } from '../types';

export default function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();

  const [keyword, setKeyword] = useState('');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow'>('all');
  const [selectedCustomDate, setSelectedCustomDate] = useState<string | null>(null);
  const [selectedCustomFormatted, setSelectedCustomFormatted] = useState<string | null>(null);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [savedEventIds, setSavedEventIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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

  const searchEvents = useCallback(async () => {
    setIsLoading(true);
    setHasSearched(true);
    try {
      let query = supabase
        .from('events')
        .select('*, colleges(name), profiles(username, full_name), interested_events(count)')
        .eq('status', 'approved')
        .or('college_only.is.null,college_only.eq.false')
        .order('created_at', { ascending: false });

      if (keyword.trim()) {
        const clean = keyword.trim();
        query = query.or(
          `title.ilike.%${clean}%,organizer_name.ilike.%${clean}%,description.ilike.%${clean}%,location.ilike.%${clean}%`
        );
      }

      if (selectedCity) {
        query = query.ilike('city', selectedCity);
      }

      if (selectedCategory) {
        query = query.ilike('category', selectedCategory);
      }

      if (priceFilter === 'free') {
        query = query.eq('is_free', true);
      } else if (priceFilter === 'paid') {
        query = query.eq('is_free', false);
      }

      const { data, error } = await query;
      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const activeEvents = ((data as any[]) || []).filter((ev) => {
        const parsed = parseEventDateString(ev.date_string || '');
        if (!parsed) return true;
        
        const evDate = new Date(parsed);
        evDate.setHours(0, 0, 0, 0);
        
        if (selectedCustomDate) {
          const y = parsed.getFullYear();
          const m = String(parsed.getMonth() + 1).padStart(2, '0');
          const d = String(parsed.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}` === selectedCustomDate;
        }

        if (evDate.getTime() < today.getTime()) return false;

        if (dateFilter === 'today') {
          return evDate.getTime() === today.getTime();
        } else if (dateFilter === 'tomorrow') {
          return evDate.getTime() === tomorrow.getTime();
        }

        return true;
      });

      setEvents(activeEvents);
    } catch (err) {
      console.error('[SearchScreen] Search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [keyword, selectedCity, selectedCategory, priceFilter, dateFilter, selectedCustomDate]);

  useEffect(() => {
    fetchSavedEventIds();
  }, [fetchSavedEventIds]);

  // Trigger search on filter / keyword change with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      searchEvents();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchEvents]);

  const clearFilters = () => {
    setKeyword('');
    setSelectedCity(null);
    setSelectedCategory(null);
    setPriceFilter('all');
    setDateFilter('all');
    setSelectedCustomDate(null);
    setSelectedCustomFormatted(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Bar Header */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            style={styles.input}
            placeholder="Search events, colleges, hackathons..."
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

        {/* Filter Chips Horizontal Scroll: Today | Tomorrow | Calendar | City | Category */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {/* 1. Today */}
          <TouchableOpacity
            style={[styles.chip, dateFilter === 'today' && !selectedCustomDate && styles.chipActive]}
            onPress={() => {
              setSelectedCustomDate(null);
              setSelectedCustomFormatted(null);
              setDateFilter(dateFilter === 'today' ? 'all' : 'today');
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, dateFilter === 'today' && !selectedCustomDate && styles.chipTextActive]}>
              Today
            </Text>
          </TouchableOpacity>

          {/* 2. Tomorrow */}
          <TouchableOpacity
            style={[styles.chip, dateFilter === 'tomorrow' && !selectedCustomDate && styles.chipActive]}
            onPress={() => {
              setSelectedCustomDate(null);
              setSelectedCustomFormatted(null);
              setDateFilter(dateFilter === 'tomorrow' ? 'all' : 'tomorrow');
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, dateFilter === 'tomorrow' && !selectedCustomDate && styles.chipTextActive]}>
              Tomorrow
            </Text>
          </TouchableOpacity>

          {/* 3. Calendar Button */}
          <TouchableOpacity
            style={[styles.dropdownChip, selectedCustomDate && styles.chipActive]}
            onPress={() => setShowDatePickerModal(true)}
            activeOpacity={0.8}
          >
            <Calendar size={13} color={selectedCustomDate ? '#FFF' : '#64748B'} />
            <Text style={[styles.chipText, selectedCustomDate && styles.chipTextActive]}>
              {selectedCustomFormatted || 'Date'}
            </Text>
          </TouchableOpacity>

          {/* 4. City Dropdown */}
          <TouchableOpacity
            style={[styles.dropdownChip, selectedCity && styles.chipActive]}
            onPress={() => setShowCityModal(true)}
            activeOpacity={0.8}
          >
            <MapPin size={13} color={selectedCity ? '#FFF' : '#64748B'} />
            <Text style={[styles.chipText, selectedCity && styles.chipTextActive]}>
              {selectedCity || 'City'}
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
              {selectedCategory || 'Category'}
            </Text>
            <ChevronDown size={14} color={selectedCategory ? '#FFF' : '#64748B'} />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Results / Content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6C47FF" />
          <Text style={styles.loadingText}>Searching live events...</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          updateCellsBatchingPeriod={50}
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
              <Text style={styles.emptyTitle}>
                {keyword || selectedCategory || selectedCity
                  ? 'No matching events found'
                  : 'Search through India’s event dictionary'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {keyword || selectedCategory || selectedCity
                  ? 'Try searching with different keywords, colleges, or reset your filters.'
                  : 'Find hackathons, summits, campus fests, comedy shows & workshops in seconds.'}
              </Text>
              {(keyword || selectedCategory || selectedCity || priceFilter !== 'all' || dateFilter !== 'all') && (
                <TouchableOpacity style={styles.resetBtn} onPress={clearFilters}>
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
        onSelect={(c) => setSelectedCity(c)}
        onClose={() => setShowCityModal(false)}
        allowClear
        clearLabel="All Cities"
        onClear={() => setSelectedCity(null)}
        searchPlaceholder="Search Indian cities..."
      />

      {/* Calendar Date Picker Modal */}
      <DatePickerModal
        visible={showDatePickerModal}
        title="Select Event Date"
        initialDateString={selectedCustomDate}
        onSelect={(formatted, iso) => {
          setDateFilter('all');
          setSelectedCustomDate(iso);
          setSelectedCustomFormatted(formatted.split(' ').slice(0, 2).join(' '));
        }}
        onClose={() => setShowDatePickerModal(false)}
        allowClear
        onClear={() => {
          setSelectedCustomDate(null);
          setSelectedCustomFormatted(null);
        }}
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
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
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
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
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
    fontSize: 12,
    fontWeight: '700',
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
    fontSize: 12,
    fontWeight: '700',
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
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
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
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
