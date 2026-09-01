import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Sparkles, Trophy, MapPin, Compass, Search } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { EventCard } from '../components/EventCard';
import { CATEGORIES_LIST } from '../lib/category-config';
import { CITIES } from '../lib/constants/cities';
import type { EventRow, RootStackParamList } from '../types';

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, profile, isOnboarded } = useAuth();

  const [activeTab, setActiveTab] = useState<'forYou' | 'aroundYou'>('forYou');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [savedEventIds, setSavedEventIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      console.error('Fetch saved events error:', e);
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
        console.error('[HomeScreen] Error fetching events:', error);
        return;
      }

      const allApproved = data || [];

      if (activeTab === 'forYou') {
        const preferredCities = profile?.preferred_cities || [];
        const preferredGoals = profile?.goals || [];

        if (preferredCities.length > 0 || preferredGoals.length > 0) {
          const personalized = allApproved.filter((ev) => {
            const matchesCity = ev.city && preferredCities.includes(ev.city);
            const matchesCategory = ev.category && preferredGoals.includes(ev.category);
            const isVirtual = ev.is_virtual === true;
            return matchesCity || matchesCategory || isVirtual;
          });

          // If personalized subset is found, use it; otherwise fallback smoothly to all approved
          setEvents(personalized.length > 0 ? personalized : allApproved);
        } else {
          setEvents(allApproved);
        }
      } else {
        setEvents(allApproved);
      }
    } catch (err) {
      console.error('[HomeScreen] Fetch events exception:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab, profile, selectedCategory, selectedCity]);

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

  const handleSaveToggle = (eventId: string, isSaved: boolean) => {
    setSavedEventIds((prev) => {
      const next = new Set(prev);
      if (isSaved) next.add(eventId);
      else next.delete(eventId);
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top App Header */}
      <View style={styles.topHeader}>
        <View style={styles.brandRow}>
          <View style={styles.brandLogo}>
            <Sparkles size={20} color="#FFF" />
          </View>
          <View>
            <Text style={styles.brandTitle}>EvenTime</Text>
            <Text style={styles.brandSubtitle}>
              {profile?.full_name ? `Hey, ${profile.full_name.split(' ')[0]} 👋` : 'Discover Campus & Tech Events'}
            </Text>
          </View>
        </View>

        {/* Header Action Badges */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.leaderboardBadge}
            onPress={() => navigation.navigate('Leaderboard')}
            activeOpacity={0.8}
          >
            <Trophy size={16} color="#F59E0B" />
            <Text style={styles.etScoreText}>
              {profile?.et_score ? `${profile.et_score} ET` : 'Leaderboard'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Segment Tabs: For You vs Around You */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'forYou' && styles.tabButtonActive]}
          onPress={() => setActiveTab('forYou')}
          activeOpacity={0.8}
        >
          <Sparkles size={15} color={activeTab === 'forYou' ? theme.colors.brand : theme.colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'forYou' && styles.tabTextActive]}>
            For You
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'aroundYou' && styles.tabButtonActive]}
          onPress={() => setActiveTab('aroundYou')}
          activeOpacity={0.8}
        >
          <Compass size={15} color={activeTab === 'aroundYou' ? theme.colors.brand : theme.colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'aroundYou' && styles.tabTextActive]}>
            Around You
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick Horizontal Filter Strip */}
      <View style={styles.filtersWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          {/* Reset Chip */}
          {(selectedCategory || selectedCity) && (
            <TouchableOpacity
              style={styles.clearChip}
              onPress={() => {
                setSelectedCategory(null);
                setSelectedCity(null);
              }}
            >
              <Text style={styles.clearChipText}>Clear Filters ✕</Text>
            </TouchableOpacity>
          )}

          {/* Categories */}
          {CATEGORIES_LIST.slice(0, 10).map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setSelectedCategory(isSelected ? null : cat)}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Events Feed */}
      {isLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={theme.colors.brand} />
          <Text style={styles.loadingText}>Curating verified events...</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.brand}
              colors={[theme.colors.brand]}
            />
          }
          renderItem={({ item }) => (
            <EventCard
              event={item}
              isSaved={savedEventIds.has(item.id)}
              onPress={() => navigation.navigate('EventDetail', { slug: item.slug || item.id, id: item.id })}
              onSaveToggle={handleSaveToggle}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Compass size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyTitle}>No Approved Events Found</Text>
              <Text style={styles.emptySubtitle}>
                {selectedCategory || selectedCity
                  ? 'Try clearing active filters to see all available events.'
                  : 'Check back soon as curators post new tech and campus events!'}
              </Text>
              {(selectedCategory || selectedCity) && (
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() => {
                    setSelectedCategory(null);
                    setSelectedCity(null);
                  }}
                >
                  <Text style={styles.emptyActionText}>Show All Events</Text>
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
    backgroundColor: theme.colors.background,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandLogo: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leaderboardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    gap: 5,
  },
  etScoreText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surfaceSecondary,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.brandLight,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.brand,
  },
  filtersWrapper: {
    backgroundColor: theme.colors.surface,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  filtersScroll: {
    paddingHorizontal: theme.spacing.xl,
    gap: 8,
  },
  clearChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.dangerBg,
  },
  clearChipText: {
    color: theme.colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  listContent: {
    padding: theme.spacing.xl,
    paddingBottom: 40,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
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
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  emptyActionBtn: {
    marginTop: 8,
    backgroundColor: theme.colors.brand,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
  },
  emptyActionText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
