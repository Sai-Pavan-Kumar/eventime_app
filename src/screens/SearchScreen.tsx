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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Search, X, SlidersHorizontal, MapPin } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { EventCard } from '../components/EventCard';
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
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'weekend'>('all');

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
        
        if (evDate.getTime() < today.getTime()) return false;

        if (dateFilter === 'today') {
          return evDate.getTime() === today.getTime();
        } else if (dateFilter === 'tomorrow') {
          return evDate.getTime() === tomorrow.getTime();
        } else if (dateFilter === 'weekend') {
          const day = evDate.getDay();
          return day === 0 || day === 6;
        }

        return true;
      });

      setEvents(activeEvents);
    } catch (err) {
      console.error('[SearchScreen] Search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [keyword, selectedCity, selectedCategory, priceFilter, dateFilter]);

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

        {/* Filter Chips Horizontal Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {/* Date Filters */}
          <TouchableOpacity
            style={[styles.chip, dateFilter === 'today' && styles.chipActive]}
            onPress={() => setDateFilter(dateFilter === 'today' ? 'all' : 'today')}
          >
            <Text style={[styles.chipText, dateFilter === 'today' && styles.chipTextActive]}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, dateFilter === 'tomorrow' && styles.chipActive]}
            onPress={() => setDateFilter(dateFilter === 'tomorrow' ? 'all' : 'tomorrow')}
          >
            <Text style={[styles.chipText, dateFilter === 'tomorrow' && styles.chipTextActive]}>Tomorrow</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, dateFilter === 'weekend' && styles.chipActive]}
            onPress={() => setDateFilter(dateFilter === 'weekend' ? 'all' : 'weekend')}
          >
            <Text style={[styles.chipText, dateFilter === 'weekend' && styles.chipTextActive]}>Weekend</Text>
          </TouchableOpacity>

          {/* Price Filters */}
          <TouchableOpacity
            style={[styles.chip, priceFilter === 'free' && styles.chipActive]}
            onPress={() => setPriceFilter(priceFilter === 'free' ? 'all' : 'free')}
          >
            <Text style={[styles.chipText, priceFilter === 'free' && styles.chipTextActive]}>Free</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, priceFilter === 'paid' && styles.chipActive]}
            onPress={() => setPriceFilter(priceFilter === 'paid' ? 'all' : 'paid')}
          >
            <Text style={[styles.chipText, priceFilter === 'paid' && styles.chipTextActive]}>Paid</Text>
          </TouchableOpacity>

          {/* Category Chips */}
          {CATEGORIES_LIST.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSelectedCategory(active ? null : cat)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
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
