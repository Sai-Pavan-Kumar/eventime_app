import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Search, CalendarDays } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { CITIES } from '../lib/constants/cities';
import { getCityImage, APP_ASSETS } from '../lib/asset-registry';
import { parseEventDateString } from '../lib/utils/date';
import { withTimeout } from '../lib/api-resilience';
import type { RootStackParamList } from '../types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 44) / 2;

export default function CitiesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [cityCounts, setCityCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const query = supabase
          .from('events')
          .select('city, date_string')
          .eq('status', 'approved')
          .or('college_only.is.null,college_only.eq.false');

        const { data, error } = await withTimeout(query, 8000);

        if (!error && data) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const counts: Record<string, number> = {};
          data.forEach((ev: any) => {
            // Strictly exclude past events from upcoming city counts
            const parsed = parseEventDateString(ev.date_string || '');
            if (parsed) {
              const evDate = new Date(parsed);
              evDate.setHours(0, 0, 0, 0);
              if (evDate.getTime() < today.getTime()) {
                return;
              }
            }

            if (ev.city) {
              const name = ev.city.trim();
              counts[name] = (counts[name] || 0) + 1;
            }
          });
          setCityCounts(counts);
        }
      } catch (err) {
        console.error('[CitiesScreen] Fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Display ONLY cities that currently have active upcoming events
  const activeCityList = useMemo(() => {
    return CITIES.map((name) => ({
      name,
      count: cityCounts[name] || 0,
    }))
      .filter((c) => c.count > 0)
      .sort((a, b) => {
        // Online first if has events
        if (a.name.toLowerCase() === 'online' && a.count > 0) return -1;
        if (b.name.toLowerCase() === 'online' && b.count > 0) return 1;

        // Higher event count first
        if (b.count !== a.count) return b.count - a.count;
        return a.name.localeCompare(b.name);
      });
  }, [cityCounts]);

  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return activeCityList;
    return activeCityList.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  }, [activeCityList, searchQuery]);

  const handleHostEvent = () => {
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
    navigation.navigate('CreateEvent', {});
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Explore by City</Text>
        <Text style={styles.subtitle}>
          Discover upcoming conferences, hackathons & meetups happening in active cities
        </Text>

        {/* Search Input */}
        <View style={styles.searchWrapper}>
          <Search size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search active city..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Grid of Cities */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6C47FF" />
          <Text style={styles.loadingText}>Finding active cities...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCities}
          keyExtractor={(item) => item.name}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Image
                source={APP_ASSETS.illustrations.search}
                style={styles.emptyImage}
                contentFit="contain"
              />
              <Text style={styles.emptyTitle}>No active events in this city</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? `No upcoming events found for "${searchQuery}". Check upcoming events on the home page.`
                  : 'No cities currently have upcoming events scheduled. Be the first to host one!'}
              </Text>
              <TouchableOpacity
                style={styles.hostBtn}
                onPress={handleHostEvent}
              >
                <Text style={styles.hostBtnText}>Host An Event in Your City</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const cityImage = getCityImage(item.name);
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.88}
                onPress={() =>
                  navigation.navigate('CityEvents', {
                    city: item.name,
                  })
                }
              >
                <Image
                  source={cityImage}
                  style={styles.cardImage}
                  contentFit="cover"
                  transition={200}
                />
                <View style={styles.cardGradient} />

                <View style={styles.cardContent}>
                  <Text style={styles.cityName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.countBadge}>
                    <CalendarDays size={11} color="#6C47FF" />
                    <Text style={styles.countText}>
                      {item.count} {item.count === 1 ? 'Event' : 'Events'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
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
    fontFamily: 'Switzer-Medium',
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Switzer-Regular',
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 18,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginTop: 14,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Switzer-Medium',
    fontSize: 14,
    color: '#0F172A',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    width: CARD_WIDTH,
    height: 140,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  cardContent: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  cityName: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  countText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 11,
    color: '#6C47FF',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyImage: {
    width: 200,
    height: 140,
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: '#0F172A',
    marginBottom: 6,
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
  hostBtn: {
    backgroundColor: '#6C47FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 100,
  },
  hostBtnText: {
    fontFamily: 'Switzer-Bold',
    color: '#FFF',
    fontSize: 13,
  },
});
