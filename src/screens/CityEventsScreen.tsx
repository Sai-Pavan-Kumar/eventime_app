import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { EventCard } from '../components/EventCard';
import { getCityCover, APP_ASSETS } from '../lib/asset-registry';
import { parseEventDateString } from '../lib/utils/date';
import type { EventRow, RootStackParamList } from '../types';

export default function CityEventsScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'CityEvents'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { city } = route.params;

  const [events, setEvents] = useState<EventRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('status', 'approved')
          .ilike('city', city)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // Strictly filter out past events so only upcoming events in this city are shown
          const upcomingEvents = data.filter((ev) => {
            const parsed = parseEventDateString(ev.date_string || '');
            if (!parsed) return true;
            const evDate = new Date(parsed);
            evDate.setHours(0, 0, 0, 0);
            return evDate.getTime() >= today.getTime();
          });

          setEvents(upcomingEvents);
        }
      } catch (err) {
        console.error('[CityEventsScreen] Fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [city]);

  const cityCover = getCityCover(city);

  const renderHeader = () => (
    <View style={styles.headerBannerContainer}>
      <Image
        source={cityCover}
        style={styles.cityCoverImage}
        contentFit="cover"
      />
      <View style={styles.coverOverlay} />

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <ArrowLeft size={20} color="#0F172A" />
      </TouchableOpacity>

      <View style={styles.coverTextContainer}>
        <Text style={styles.coverTitle}>Events in {city}</Text>
        <Text style={styles.coverSubtitle}>
          {events.length} {events.length === 1 ? 'upcoming event' : 'upcoming events'}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6C47FF" />
          <Text style={styles.loadingText}>Loading upcoming {city} events...</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Image
                source={APP_ASSETS.illustrations.empty}
                style={styles.emptyImage}
                contentFit="contain"
              />
              <Text style={styles.emptyTitle}>No Upcoming Events</Text>
              <Text style={styles.emptySubtitle}>
                There are no upcoming events scheduled in {city} right now. Check back soon or host the first one!
              </Text>
              <TouchableOpacity
                style={styles.hostBtn}
                onPress={() => (navigation as any).navigate('CreateTab')}
              >
                <Text style={styles.hostBtnText}>Host An Event in {city}</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <EventCard
                event={item}
                onPress={() =>
                  navigation.navigate('EventDetail', {
                    id: item.id,
                    eventId: item.id,
                    slug: item.slug || item.id,
                  })
                }
              />
            </View>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 100,
  },
  headerBannerContainer: {
    width: '100%',
    height: 180,
    backgroundColor: '#0F172A',
    position: 'relative',
    marginBottom: 16,
  },
  cityCoverImage: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  coverTextContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#6C47FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  cityBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  coverTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  coverSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
    marginTop: 2,
  },
  cardWrapper: {
    paddingHorizontal: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyImage: {
    width: 200,
    height: 140,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  hostBtn: {
    backgroundColor: '#6C47FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 100,
  },
  hostBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
