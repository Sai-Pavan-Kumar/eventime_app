import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Search, CalendarDays } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { CITIES } from '../lib/constants/cities';
import { getCityImage } from '../lib/asset-registry';
import type { RootStackParamList } from '../types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 44) / 2;

export default function CitiesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [searchQuery, setSearchQuery] = useState('');
  const [cityCounts, setCityCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('city')
          .eq('status', 'approved');

        if (!error && data) {
          const counts: Record<string, number> = {};
          data.forEach((ev) => {
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

  const cityList = CITIES.map((c) => ({
    name: c,
    count: cityCounts[c] || 0,
  }));

  // Pinned "Online" first, followed by cities with most events, then alphabetically
  const onlineItem = cityList.find((c) => c.name.toLowerCase() === 'online');
  const otherCities = cityList
    .filter((c) => c.name.toLowerCase() !== 'online')
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });

  const sortedCities = onlineItem ? [onlineItem, ...otherCities] : otherCities;

  const filteredCities = sortedCities.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Explore by City</Text>
        <Text style={styles.subtitle}>
          Discover conferences, hackathons & meetups happening across India
        </Text>

        {/* Search Input */}
        <View style={styles.searchWrapper}>
          <Search size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search 30+ Indian cities..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6C47FF" />
          <Text style={styles.loadingText}>Loading cities...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCities}
          keyExtractor={(item) => item.name}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={({ item }) => {
            const cityImage = getCityImage(item.name);
            return (
              <TouchableOpacity
                style={styles.cityCard}
                activeOpacity={0.88}
                onPress={() => navigation.navigate('CityEvents', { city: item.name })}
              >
                {/* 16:9 Genuine .webp City Banner */}
                <View style={styles.imageContainer}>
                  <Image
                    source={cityImage}
                    style={styles.cityBanner}
                    contentFit="cover"
                    transition={200}
                  />
                </View>

                {/* City Name & Real Event Counts */}
                <View style={styles.cityInfo}>
                  <Text style={styles.cityName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.countRow}>
                    <CalendarDays size={13} color="#6C47FF" />
                    <Text style={styles.cityCount}>
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 18,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cityCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 16 / 10,
    backgroundColor: '#F1F5F9',
  },
  cityBanner: {
    width: '100%',
    height: '100%',
  },
  cityInfo: {
    padding: 12,
  },
  cityName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cityCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
});
