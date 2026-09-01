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
import { ArrowLeft, MapPin } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { EventCard } from '../components/EventCard';
import { getCityCover, APP_ASSETS } from '../lib/asset-registry';
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
          setEvents(data);
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
        <View style={styles.badgeRow}>
          <MapPin size={14} color="#FFF" />
          <Text style={styles.cityBadgeText}>{city}</Text>
        </View>
        <Text style={styles.coverTitle}>Events in {city}</Text>
        <Text style={styles.coverSubtitle}>
          {events.length} {events.length === 1 ? 'event' : 'events'} curated
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6C47FF" />
          <Text style={styles.loadingText}>Loading {city} events...</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <EventCard
                event={item}
                onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
              />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Image
                source={APP_ASSETS.illustrations.empty}
                style={styles.emptyIllustration}
                contentFit="contain"
              />
              <Text style={styles.emptyTitle}>No events in {city} right now</Text>
              <Text style={styles.emptySubtitle}>
                Be the first organizer to list an event in {city}!
              </Text>
              <TouchableOpacity
                style={styles.createBtn}
                onPress={() => (navigation as any).navigate('CreateTab')}
              >
                <Text style={styles.createBtnText}>+ Host Event in {city}</Text>
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
  headerBannerContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
    marginBottom: 16,
    justifyContent: 'flex-end',
    padding: 16,
  },
  cityCoverImage: {
    ...StyleSheet.absoluteFillObject,
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  backButton: {
    position: 'absolute',
    top: 14,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverTextContainer: {
    zIndex: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  cityBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  coverTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  coverSubtitle: {
    fontSize: 13,
    color: '#E2E8F0',
    fontWeight: '600',
    marginTop: 2,
  },
  listContent: {
    paddingBottom: 40,
  },
  cardWrapper: {
    paddingHorizontal: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyIllustration: {
    width: 200,
    height: 140,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 19,
  },
  createBtn: {
    backgroundColor: '#6C47FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 100,
  },
  createBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
