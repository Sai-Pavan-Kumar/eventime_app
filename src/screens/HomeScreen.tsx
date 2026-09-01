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
  Calendar,
  X,
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

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, profile } = useAuth();

  const [activeTab, setActiveTab] = useState<'all' | 'forYou'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [savedEventIds, setSavedEventIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);

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

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Exclude past events so only upcoming / today's events appear in active feed
      const allApproved = (data || []).filter((ev) => {
        const parsed = parseEventDateString(ev.date_string || '');
        if (!parsed) return true;
        const evDate = new Date(parsed);
        evDate.setHours(0, 0, 0, 0);
        return evDate.getTime() >= today.getTime();
      });

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
          setEvents(personalized.length > 0 ? personalized : allApproved);
        } else {
          setEvents(allApproved);
        }
      } else {
        setEvents(allApproved);
      }
    } catch (err) {
      console.error('[HomeScreen] Fetch error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedCategory, selectedCity, activeTab, profile]);

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

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Top App Bar with Genuine EvenTime Logo */}
      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <Image
            source={APP_ASSETS.logo}
            style={styles.brandLogo}
            contentFit="contain"
          />
        </View>

        <TouchableOpacity
          style={styles.searchIconBtn}
          onPress={() => (navigation as any).navigate('SearchTab')}
          activeOpacity={0.8}
        >
          <Search size={20} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* Hero Section Matching Website */}
      <View style={styles.heroCard}>
        <View style={styles.heroTextContainer}>
          <Text style={styles.heroTitle}>
            The Dictionary{'\n'}
            for <Text style={styles.heroHighlight}>Events.</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            Discover verified tech, college, networking & cultural events across India.
          </Text>
        </View>

        <Image
          source={APP_ASSETS.heroBanner}
          style={styles.heroImage}
          contentFit="contain"
        />
      </View>

      {/* Filter Chips Bar (Category & City Pickers) */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {/* Feed Tabs: All vs For You */}
          <TouchableOpacity
            style={[styles.feedPill, activeTab === 'all' && styles.feedPillActive]}
            onPress={() => setActiveTab('all')}
          >
            <Compass size={14} color={activeTab === 'all' ? '#FFF' : '#64748B'} />
            <Text style={[styles.feedPillText, activeTab === 'all' && styles.feedPillTextActive]}>
              Explore All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.feedPill, activeTab === 'forYou' && styles.feedPillActive]}
            onPress={() => setActiveTab('forYou')}
          >
            <Text style={[styles.feedPillText, activeTab === 'forYou' && styles.feedPillTextActive]}>
              For You
            </Text>
          </TouchableOpacity>

          {/* Category Dropdown Filter */}
          <TouchableOpacity
            style={[styles.filterPill, Boolean(selectedCategory) && styles.filterPillSelected]}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={[styles.filterPillText, Boolean(selectedCategory) && styles.filterPillTextSelected]}>
              {selectedCategory || 'All Categories'}
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
              {selectedCity || 'All Cities'}
            </Text>
            <ChevronDown size={14} color={selectedCity ? '#6C47FF' : '#64748B'} />
          </TouchableOpacity>

          {/* Clear Filter Button if active */}
          {(selectedCategory || selectedCity) && (
            <TouchableOpacity
              style={styles.clearPill}
              onPress={() => {
                setSelectedCategory(null);
                setSelectedCity(null);
              }}
            >
              <X size={13} color="#EF4444" />
              <Text style={styles.clearPillText}>Reset</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {activeTab === 'forYou' ? 'Recommended For You' : 'Upcoming Events'}
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
      <Text style={styles.emptyTitle}>The stage is waiting!</Text>
      <Text style={styles.emptySubtitle}>
        {selectedCategory || selectedCity
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
              colors={['#6C47FF']}
              tintColor="#6C47FF"
            />
          }
        />
      )}

      {/* Category Selection Modal */}
      {showCategoryModal && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setShowCategoryModal(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <X size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              <TouchableOpacity
                style={[styles.modalItem, !selectedCategory && styles.modalItemActive]}
                onPress={() => {
                  setSelectedCategory(null);
                  setShowCategoryModal(false);
                }}
              >
                <Text style={[styles.modalItemText, !selectedCategory && styles.modalItemTextActive]}>
                  All Categories
                </Text>
              </TouchableOpacity>
              {CATEGORIES_LIST.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.modalItem, selectedCategory === cat && styles.modalItemActive]}
                  onPress={() => {
                    setSelectedCategory(cat);
                    setShowCategoryModal(false);
                  }}
                >
                  <Text style={[styles.modalItemText, selectedCategory === cat && styles.modalItemTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* City Selection Modal */}
      {showCityModal && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setShowCityModal(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select City</Text>
              <TouchableOpacity onPress={() => setShowCityModal(false)}>
                <X size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              <TouchableOpacity
                style={[styles.modalItem, !selectedCity && styles.modalItemActive]}
                onPress={() => {
                  setSelectedCity(null);
                  setShowCityModal(false);
                }}
              >
                <Text style={[styles.modalItemText, !selectedCity && styles.modalItemTextActive]}>
                  All Cities
                </Text>
              </TouchableOpacity>
              {CITIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.modalItem, selectedCity === c && styles.modalItemActive]}
                  onPress={() => {
                    setSelectedCity(c);
                    setShowCityModal(false);
                  }}
                >
                  <Text style={[styles.modalItemText, selectedCity === c && styles.modalItemTextActive]}>
                    {c}
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
    paddingBottom: 40,
  },
  cardWrapper: {
    paddingHorizontal: 16,
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
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  logoRow: {
    height: 38,
    width: 140,
  },
  brandLogo: {
    width: '100%',
    height: '100%',
  },
  searchIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  heroTextContainer: {
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  heroHighlight: {
    color: '#6C47FF',
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 8,
    lineHeight: 20,
  },
  heroImage: {
    width: '100%',
    height: 140,
    marginTop: 4,
  },
  filterBar: {
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
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
});
