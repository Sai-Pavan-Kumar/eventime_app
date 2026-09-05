import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EventRow } from '../types';
import { parseEventDateString } from './utils/date';

/**
 * Offline-First Caching Layer (Stale-While-Revalidate Engine)
 * Provides instant 0ms cold-start hydration using L1 memory and L2 AsyncStorage persistence.
 * Prevents empty skeletons or blank screens when users are offline, in airplane mode, or underground.
 */

const CACHE_KEYS = {
  HOME_EVENTS: '@eventime_cache_home_events_v2',
  CAMPUS_EVENTS: '@eventime_cache_campus_events_v2',
  PLATFORM_STATS: '@eventime_cache_stats_v2',
  SAVED_EVENT_IDS: '@eventime_cache_saved_ids_v2',
} as const;

export interface CachedStatsData {
  event_count: number;
  city_count: number;
  category_count: number;
  user_count: number;
}

interface CacheEnvelope<T> {
  data: T;
  timestamp: number;
  version: number;
}

// L1 Fast In-Memory Cache (Instant synchronous reads during the app session)
const memoryCache = {
  homeEvents: null as CacheEnvelope<EventRow[]> | null,
  campusEvents: null as CacheEnvelope<EventRow[]> | null,
  stats: null as CacheEnvelope<CachedStatsData> | null,
  savedIds: null as CacheEnvelope<string[]> | null,
};

function filterUpcomingOnly(events: EventRow[]): EventRow[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return events.filter((ev) => {
    const parsed = parseEventDateString(ev.date_string || '');
    if (!parsed) return false;
    const evDate = new Date(parsed);
    evDate.setHours(0, 0, 0, 0);
    return evDate.getTime() >= today.getTime();
  });
}

// ==========================================
// 1. HOME FEED EVENTS CACHE
// ==========================================

export function getMemoryHomeEvents(): EventRow[] | null {
  if (!memoryCache.homeEvents?.data) return null;
  return filterUpcomingOnly(memoryCache.homeEvents.data);
}

export async function loadCachedHomeEvents(): Promise<EventRow[] | null> {
  if (memoryCache.homeEvents?.data && memoryCache.homeEvents.data.length > 0) {
    const upcoming = filterUpcomingOnly(memoryCache.homeEvents.data);
    memoryCache.homeEvents.data = upcoming;
    return upcoming;
  }
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEYS.HOME_EVENTS);
    if (!raw) return null;
    const parsed: CacheEnvelope<EventRow[]> = JSON.parse(raw);
    if (Array.isArray(parsed?.data)) {
      const upcomingData = filterUpcomingOnly(parsed.data);
      memoryCache.homeEvents = { ...parsed, data: upcomingData };
      return upcomingData;
    }
  } catch (err) {
    console.warn('[OfflineCache] Failed to load cached home events:', err);
  }
  return null;
}

export async function saveCachedHomeEvents(events: EventRow[]): Promise<void> {
  if (!events || !Array.isArray(events)) return;
  const envelope: CacheEnvelope<EventRow[]> = {
    data: events,
    timestamp: Date.now(),
    version: 2,
  };
  memoryCache.homeEvents = envelope;
  try {
    await AsyncStorage.setItem(CACHE_KEYS.HOME_EVENTS, JSON.stringify(envelope));
  } catch (err) {
    console.warn('[OfflineCache] Failed to persist home events:', err);
  }
}

// ==========================================
// 2. CAMPUS EVENTS CACHE
// ==========================================

export function getMemoryCampusEvents(): EventRow[] | null {
  if (!memoryCache.campusEvents?.data) return null;
  return filterUpcomingOnly(memoryCache.campusEvents.data);
}

export async function loadCachedCampusEvents(): Promise<EventRow[] | null> {
  if (memoryCache.campusEvents?.data && memoryCache.campusEvents.data.length > 0) {
    const upcoming = filterUpcomingOnly(memoryCache.campusEvents.data);
    memoryCache.campusEvents.data = upcoming;
    return upcoming;
  }
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEYS.CAMPUS_EVENTS);
    if (!raw) return null;
    const parsed: CacheEnvelope<EventRow[]> = JSON.parse(raw);
    if (Array.isArray(parsed?.data)) {
      const upcomingData = filterUpcomingOnly(parsed.data);
      memoryCache.campusEvents = { ...parsed, data: upcomingData };
      return upcomingData;
    }
  } catch (err) {
    console.warn('[OfflineCache] Failed to load cached campus events:', err);
  }
  return null;
}

export async function saveCachedCampusEvents(events: EventRow[]): Promise<void> {
  if (!events || !Array.isArray(events)) return;
  const envelope: CacheEnvelope<EventRow[]> = {
    data: events,
    timestamp: Date.now(),
    version: 2,
  };
  memoryCache.campusEvents = envelope;
  try {
    await AsyncStorage.setItem(CACHE_KEYS.CAMPUS_EVENTS, JSON.stringify(envelope));
  } catch (err) {
    console.warn('[OfflineCache] Failed to persist campus events:', err);
  }
}

// ==========================================
// 3. PLATFORM STATS CACHE
// ==========================================

export function getMemoryPlatformStats(): CachedStatsData | null {
  return memoryCache.stats?.data || null;
}

export async function loadCachedPlatformStats(): Promise<CachedStatsData | null> {
  if (memoryCache.stats?.data) {
    return memoryCache.stats.data;
  }
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEYS.PLATFORM_STATS);
    if (!raw) return null;
    const parsed: CacheEnvelope<CachedStatsData> = JSON.parse(raw);
    if (parsed?.data) {
      memoryCache.stats = parsed;
      return parsed.data;
    }
  } catch (err) {
    console.warn('[OfflineCache] Failed to load cached platform stats:', err);
  }
  return null;
}

export async function saveCachedPlatformStats(stats: CachedStatsData): Promise<void> {
  if (!stats) return;
  const envelope: CacheEnvelope<CachedStatsData> = {
    data: stats,
    timestamp: Date.now(),
    version: 2,
  };
  memoryCache.stats = envelope;
  try {
    await AsyncStorage.setItem(CACHE_KEYS.PLATFORM_STATS, JSON.stringify(envelope));
  } catch (err) {
    console.warn('[OfflineCache] Failed to persist platform stats:', err);
  }
}

// ==========================================
// 4. SAVED EVENT IDS CACHE
// ==========================================

export function getMemorySavedEventIds(): Set<string> | null {
  if (!memoryCache.savedIds?.data) return null;
  return new Set(memoryCache.savedIds.data);
}

export async function loadCachedSavedEventIds(): Promise<Set<string> | null> {
  if (memoryCache.savedIds?.data) {
    return new Set(memoryCache.savedIds.data);
  }
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEYS.SAVED_EVENT_IDS);
    if (!raw) return null;
    const parsed: CacheEnvelope<string[]> = JSON.parse(raw);
    if (Array.isArray(parsed?.data)) {
      memoryCache.savedIds = parsed;
      return new Set(parsed.data);
    }
  } catch (err) {
    console.warn('[OfflineCache] Failed to load cached saved event IDs:', err);
  }
  return null;
}

export async function saveCachedSavedEventIds(ids: Set<string> | string[]): Promise<void> {
  const array = Array.isArray(ids) ? ids : Array.from(ids);
  const envelope: CacheEnvelope<string[]> = {
    data: array,
    timestamp: Date.now(),
    version: 2,
  };
  memoryCache.savedIds = envelope;
  try {
    await AsyncStorage.setItem(CACHE_KEYS.SAVED_EVENT_IDS, JSON.stringify(envelope));
  } catch (err) {
    console.warn('[OfflineCache] Failed to persist saved event IDs:', err);
  }
}
