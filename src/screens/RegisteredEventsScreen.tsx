import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, CheckCircle2, Compass } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { EventCard } from '../components/EventCard';
import { FeedSkeleton } from '../components/EventCardSkeleton';
import { withTimeout } from '../lib/api-resilience';
import { useAuth } from '../context/AuthContext';
import { haptic } from '../lib/haptics';
import { appEventSync } from '../lib/eventSync';
import type { EventRow, RootStackParamList } from '../types';

export default function RegisteredEventsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();

  const [registeredEvents, setRegisteredEvents] = useState<EventRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRegistered = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    try {
      const query = supabase
        .from('registered_events')
        .select('events(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const { data, error } = await withTimeout(query, 8000);

      if (error) throw error;

      const list: EventRow[] = (data || [])
        .map((row: any) => row.events)
        .filter(Boolean);

      setRegisteredEvents(list);
    } catch (err) {
      console.error('Fetch registered events error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRegistered();
  }, [fetchRegistered]);

  // Reactive listener to remove event if user un-marks registration
  useEffect(() => {
    const unsubscribe = appEventSync.subscribe((payload) => {
      if (payload.type === 'register' && payload.isRegistered === false) {
        setRegisteredEvents((prev) => prev.filter((ev) => ev.id !== payload.eventId));
      } else if (payload.type === 'register' && payload.isRegistered === true) {
        fetchRegistered();
      }
    });
    return unsubscribe;
  }, [fetchRegistered]);

  const onRefresh = () => {
    haptic.light();
    setIsRefreshing(true);
    fetchRegistered();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            haptic.light();
            navigation.goBack();
          }}
        >
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Registered Events</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <FeedSkeleton count={3} />
      ) : (
        <FlatList
          data={registeredEvents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          updateCellsBatchingPeriod={50}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.brand}
              colors={[theme.colors.brand]}
            />
          }
          ListHeaderComponent={
            registeredEvents.length > 0 ? (
              <Text style={styles.countText}>
                {registeredEvents.length} {registeredEvents.length === 1 ? 'registered event' : 'registered events'}
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <EventCard
              event={item}
              isRegistered={true}
              onPress={() =>
                navigation.navigate('EventDetail', { slug: item.slug || item.id, id: item.id })
              }
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <CheckCircle2 size={36} color="#059669" />
              </View>
              <Text style={styles.emptyTitle}>No Registered Events Yet</Text>
              <Text style={styles.emptySubtitle}>
                When you click "Mark Registered" on events you apply for, they will appear here so you never lose track.
              </Text>
              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={() => {
                  haptic.light();
                  navigation.navigate('MainTabs');
                }}
              >
                <Compass size={18} color="#FFF" />
                <Text style={styles.exploreBtnText}>Explore Events</Text>
              </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
  },
  headerTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: theme.colors.textPrimary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  countText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 40,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  emptyTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Switzer-Regular',
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.brand,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 14,
    shadowColor: theme.colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  exploreBtnText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
