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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Search, X, SlidersHorizontal } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { EventCard } from '../components/EventCard';
import { CATEGORIES_LIST } from '../lib/category-config';
import { CITIES } from '../lib/constants/cities';
import { useAuth } from '../context/AuthContext';
import type { EventRow, RootStackParamList } from '../types';

export default function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();

  const [keyword, setKeyword] = useState('');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [virtualFilter, setVirtualFilter] = useState<'all' | 'virtual' | 'in_person'>('all');

  const [showFilters, setShowFilters] = useState(false);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [savedEventIds, setSavedEventIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

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
      console.error('Fetch saved events error:', e);
    }
  }, [user]);

  const searchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('events')
        .select('*')
        .eq('status', 'approved')
        .order('date_string', { ascending: true });

      if (keyword.trim()) {
        const clean = keyword.trim();
        query = query.or(
          `title.ilike.%${clean}%,organizer_name.ilike.%${clean}%,description.ilike.%${clean}%,location.ilike.%${clean}%`
        );
      }

      if (selectedCity) {
        query = query.eq('city', selectedCity);
      }

      if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }

      if (priceFilter === 'free') {
        query = query.eq('is_free', true);
      } else if (priceFilter === 'paid') {
        query = query.eq('is_free', false);
      }

      if (virtualFilter === 'virtual') {
        query = query.eq('is_virtual', true);
      } else if (virtualFilter === 'in_person') {
        query = query.eq('is_virtual', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('[SearchScreen] Search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [keyword, selectedCity, selectedCategory, priceFilter, virtualFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchEvents();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchEvents]);

  useEffect(() => {
    fetchSavedEventIds();
  }, [fetchSavedEventIds]);

  const activeFiltersCount =
    (selectedCity ? 1 : 0) +
    (selectedCategory ? 1 : 0) +
    (priceFilter !== 'all' ? 1 : 0) +
    (virtualFilter !== 'all' ? 1 : 0);

  const resetFilters = () => {
    setSelectedCity(null);
    setSelectedCategory(null);
    setPriceFilter('all');
    setVirtualFilter('all');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Input Bar */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchInputContainer}>
          <Search size={18} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events, organizers, keywords..."
            placeholderTextColor={theme.colors.textMuted}
            value={keyword}
            onChangeText={setKeyword}
            returnKeyType="search"
          />
          {keyword.length > 0 && (
            <TouchableOpacity onPress={() => setKeyword('')} style={{ padding: 4 }}>
              <X size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Toggle Button */}
        <TouchableOpacity
          style={[styles.filterToggleBtn, activeFiltersCount > 0 && styles.filterToggleBtnActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal
            size={18}
            color={activeFiltersCount > 0 ? '#FFF' : theme.colors.textPrimary}
          />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Expandable Filter Drawer / Panel */}
      {showFilters && (
        <View style={styles.filterDrawer}>
          <View style={styles.filterDrawerHeader}>
            <Text style={styles.filterDrawerTitle}>Filter Events</Text>
            {activeFiltersCount > 0 && (
              <TouchableOpacity onPress={resetFilters}>
                <Text style={styles.resetText}>Reset All</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
            {/* Price Filter */}
            <Text style={styles.sectionLabel}>Pricing</Text>
            <View style={styles.chipRow}>
              {(['all', 'free', 'paid'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.smallChip, priceFilter === p && styles.smallChipActive]}
                  onPress={() => setPriceFilter(p)}
                >
                  <Text
                    style={[styles.smallChipText, priceFilter === p && styles.smallChipTextActive]}
                  >
                    {p === 'all' ? 'All Prices' : p === 'free' ? 'Free Only' : 'Paid Only'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Mode Filter */}
            <Text style={styles.sectionLabel}>Event Mode</Text>
            <View style={styles.chipRow}>
              {(['all', 'virtual', 'in_person'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.smallChip, virtualFilter === m && styles.smallChipActive]}
                  onPress={() => setVirtualFilter(m)}
                >
                  <Text
                    style={[styles.smallChipText, virtualFilter === m && styles.smallChipTextActive]}
                  >
                    {m === 'all' ? 'All Modes' : m === 'virtual' ? 'Virtual Only' : 'In-Person'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* City Selection */}
            <Text style={styles.sectionLabel}>City</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
              {CITIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.smallChip, selectedCity === c && styles.smallChipActive]}
                  onPress={() => setSelectedCity(selectedCity === c ? null : c)}
                >
                  <Text
                    style={[styles.smallChipText, selectedCity === c && styles.smallChipTextActive]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Category Selection */}
            <Text style={styles.sectionLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
              {CATEGORIES_LIST.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.smallChip, selectedCategory === cat && styles.smallChipActive]}
                  onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                >
                  <Text
                    style={[
                      styles.smallChipText,
                      selectedCategory === cat && styles.smallChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </ScrollView>
        </View>
      )}

      {/* Results Feed */}
      {isLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={theme.colors.brand} />
          <Text style={styles.loadingText}>Searching events...</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.resultsCount}>
              {events.length} {events.length === 1 ? 'event' : 'events'} found
            </Text>
          }
          renderItem={({ item }) => (
            <EventCard
              event={item}
              isSaved={savedEventIds.has(item.id)}
              onPress={() =>
                navigation.navigate('EventDetail', { slug: item.slug || item.id, id: item.id })
              }
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
              <Search size={44} color={theme.colors.textMuted} />
              <Text style={styles.emptyTitle}>No matching events</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search keywords or clearing active filters.
              </Text>
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
    backgroundColor: theme.colors.background,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 10,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  filterToggleBtn: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterToggleBtnActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
  },
  filterDrawer: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterDrawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterDrawerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  resetText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.danger,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  horizontalChips: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  smallChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 6,
  },
  smallChipActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  smallChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  smallChipTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  listContent: {
    padding: theme.spacing.xl,
    paddingBottom: 40,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },
});
