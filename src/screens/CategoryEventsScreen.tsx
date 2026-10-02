import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Sparkles, Plus, Compass } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { EventCard } from '../components/EventCard';
import { APP_ASSETS } from '../lib/asset-registry';
import { parseEventDateString } from '../lib/utils/date';
import { haptic } from '../lib/haptics';
import { FeedSkeleton } from '../components/EventCardSkeleton';
import { withTimeout } from '../lib/api-resilience';
import type { EventRow, RootStackParamList } from '../types';

const PAGE_SIZE = 12;

export default function CategoryEventsScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'CategoryEvents'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { category } = route.params;

  const [events, setEvents] = useState<EventRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchCategoryEvents = useCallback(
    async (pageIndex = 0, isRefresh = false) => {
      try {
        if (pageIndex === 0 && !isRefresh) setIsLoading(true);

        const from = pageIndex * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const CATEGORY_EVENT_FIELDS =
          'id, slug, title, category, date_string, start_time, end_time, location, city, poster_url, organizer_name, is_free, is_featured, is_virtual, college_only, college_id, goal_tags, branch_tags, target_audience, creator_id, created_at, colleges(name), profiles(username, full_name), interested_events(count)';

        const query = supabase
          .from('events')
          .select(CATEGORY_EVENT_FIELDS)
          .eq('status', 'approved')
          .or('college_only.is.null,college_only.eq.false')
          .ilike('category', category)
          .order('date_string', { ascending: true })
          .range(from, to);

        const { data, error } = await withTimeout(query, 8000);

        if (error) throw error;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Filter out past events and sort chronologically ascending (upcoming dates first)
        const upcomingBatch = (data || [])
          .filter((ev: any) => {
            const parsed = parseEventDateString(ev.date_string || '');
            if (!parsed) return true;
            const evDate = new Date(parsed);
            evDate.setHours(0, 0, 0, 0);
            return evDate.getTime() >= today.getTime();
          })
          .sort((a: any, b: any) => {
            const da = parseEventDateString(a.date_string || '')?.getTime() || Infinity;
            const db = parseEventDateString(b.date_string || '')?.getTime() || Infinity;
            return da - db;
          });

        if (!data || data.length < PAGE_SIZE) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }

        const batch = upcomingBatch as unknown as EventRow[];
        setEvents((prev) => (pageIndex === 0 ? batch : [...prev, ...batch]));
      } catch (err) {
        console.error('[CategoryEventsScreen] Fetch error:', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsFetchingMore(false);
      }
    },
    [category]
  );

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchCategoryEvents(0);
  }, [fetchCategoryEvents]);

  const onRefresh = () => {
    haptic.light();
    setIsRefreshing(true);
    setPage(0);
    setHasMore(true);
    fetchCategoryEvents(0, true);
  };

  const loadMore = () => {
    if (!hasMore || isFetchingMore || isLoading || isRefreshing) return;
    setIsFetchingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchCategoryEvents(nextPage);
  };

  const handleHostEvent = () => {
    haptic.light();
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in or create an account to host an event.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }
    navigation.navigate('CreateEvent', {
      event: { category },
    });
  };

  const renderHeader = () => (
    <View style={styles.headerBanner}>
      <View style={styles.headerTopRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            haptic.light();
            navigation.goBack();
          }}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.hostPillBtn}
          onPress={handleHostEvent}
          activeOpacity={0.8}
        >
          <Plus size={14} color="#6C47FF" />
          <Text style={styles.hostPillText}>Host in this Category</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.headerTitleWrap}>
        <View style={styles.badgeRow}>
          <Sparkles size={14} color="#6C47FF" />
          <Text style={styles.badgeText}>Category Explorer</Text>
        </View>
        <Text style={styles.headerTitle}>{category}</Text>
        <Text style={styles.headerSubtitle}>
          {events.length} {events.length === 1 ? 'upcoming event' : 'upcoming events'} available in this category
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {isLoading ? (
        <View style={{ flex: 1 }}>
          {renderHeader()}
          <FeedSkeleton count={3} />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          updateCellsBatchingPeriod={50}
          keyboardDismissMode="on-drag"
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={['#6C47FF']}
              tintColor="#6C47FF"
            />
          }
          ListFooterComponent={
            isFetchingMore ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator size="small" color="#6C47FF" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Image
                source={APP_ASSETS.illustrations.empty}
                style={styles.emptyImage}
                contentFit="contain"
              />
              <Text style={styles.emptyTitle}>No Upcoming Events</Text>
              <Text style={styles.emptySubtitle}>
                There are currently no upcoming events listed under "{category}". Be the first to share one!
              </Text>
              <TouchableOpacity
                style={styles.hostEmptyBtn}
                onPress={handleHostEvent}
                activeOpacity={0.8}
              >
                <Plus size={16} color="#FFF" />
                <Text style={styles.hostEmptyBtnText}>Host a {category} Event</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.exploreEmptyBtn}
                onPress={() => {
                  haptic.light();
                  navigation.navigate('MainTabs');
                }}
                activeOpacity={0.8}
              >
                <Compass size={16} color="#6C47FF" />
                <Text style={styles.exploreEmptyBtnText}>Explore Other Categories</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <EventCard
              event={item}
              onPress={() =>
                navigation.navigate('EventDetail', { slug: item.slug || item.id, id: item.id })
              }
            />
          )}
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
  headerBanner: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  hostPillText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: '#6C47FF',
  },
  headerTitleWrap: {
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F5F3FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 4,
  },
  badgeText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 11,
    color: '#6C47FF',
    letterSpacing: 0.2,
  },
  headerTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 24,
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontFamily: 'Switzer-Regular',
    fontSize: 13,
    color: '#64748B',
  },
  listContent: {
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyImage: {
    width: 140,
    height: 140,
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Switzer-Regular',
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  hostEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#6C47FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginBottom: 10,
    width: '100%',
    justifyContent: 'center',
  },
  hostEmptyBtnText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  exploreEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: '100%',
    justifyContent: 'center',
  },
  exploreEmptyBtnText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 14,
    color: '#6C47FF',
  },
});
