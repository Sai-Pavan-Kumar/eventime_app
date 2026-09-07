import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EventRow, LeaderboardViewRow } from '../types';
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
  LEADERBOARD_CAMPUS: '@eventime_cache_leaderboard_campus_v1',
  LEADERBOARD_CITY: '@eventime_cache_leaderboard_city_v1',
  LEADERBOARD_ALL_TIME: '@eventime_cache_leaderboard_all_time_v1',
  EVENT_DETAIL_PREFIX: '@eventime_cache_event_detail_',
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
  leaderboard: {
    campus: null as CacheEnvelope<LeaderboardViewRow[]> | null,
    city: null as CacheEnvelope<LeaderboardViewRow[]> | null,
    all_time: null as CacheEnvelope<LeaderboardViewRow[]> | null,
  },
  eventDetails: new Map<string, CacheEnvelope<EventRow>>(),
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

// ==========================================
// 5. LEADERBOARD CACHE
// ==========================================

export function getMemoryLeaderboard(cohort: 'campus' | 'city' | 'all_time'): LeaderboardViewRow[] | null {
  return memoryCache.leaderboard[cohort]?.data || null;
}

export async function loadCachedLeaderboard(
  cohort: 'campus' | 'city' | 'all_time'
): Promise<LeaderboardViewRow[] | null> {
  if (memoryCache.leaderboard[cohort]?.data) {
    return memoryCache.leaderboard[cohort]!.data;
  }
  const key =
    cohort === 'campus'
      ? CACHE_KEYS.LEADERBOARD_CAMPUS
      : cohort === 'city'
      ? CACHE_KEYS.LEADERBOARD_CITY
      : CACHE_KEYS.LEADERBOARD_ALL_TIME;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed: CacheEnvelope<LeaderboardViewRow[]> = JSON.parse(raw);
    if (Array.isArray(parsed?.data)) {
      memoryCache.leaderboard[cohort] = parsed;
      return parsed.data;
    }
  } catch (err) {
    console.warn(`[OfflineCache] Failed to load cached leaderboard (${cohort}):`, err);
  }
  return null;
}

export async function saveCachedLeaderboard(
  cohort: 'campus' | 'city' | 'all_time',
  rows: LeaderboardViewRow[]
): Promise<void> {
  if (!rows || !Array.isArray(rows)) return;
  const key =
    cohort === 'campus'
      ? CACHE_KEYS.LEADERBOARD_CAMPUS
      : cohort === 'city'
      ? CACHE_KEYS.LEADERBOARD_CITY
      : CACHE_KEYS.LEADERBOARD_ALL_TIME;
  const envelope: CacheEnvelope<LeaderboardViewRow[]> = {
    data: rows,
    timestamp: Date.now(),
    version: 1,
  };
  memoryCache.leaderboard[cohort] = envelope;
  try {
    await AsyncStorage.setItem(key, JSON.stringify(envelope));
  } catch (err) {
    console.warn(`[OfflineCache] Failed to persist leaderboard (${cohort}):`, err);
  }
}

// ==========================================
// 6. EVENT DETAIL CACHE (0ms Instant Hydration)
// ==========================================

const MAX_IN_MEMORY_EVENT_DETAILS = 40;

function setBoundedEventDetail(key: string, envelope: CacheEnvelope<EventRow>) {
  if (memoryCache.eventDetails.size >= MAX_IN_MEMORY_EVENT_DETAILS) {
    const oldestKey = memoryCache.eventDetails.keys().next().value;
    if (oldestKey) memoryCache.eventDetails.delete(oldestKey);
  }
  memoryCache.eventDetails.set(key, envelope);
}

export function getMemoryEventDetail(target: string): EventRow | null {
  if (!target) return null;
  return memoryCache.eventDetails.get(target)?.data || null;
}

export async function loadCachedEventDetail(target: string): Promise<EventRow | null> {
  if (!target) return null;
  const inMemory = memoryCache.eventDetails.get(target);
  if (inMemory?.data) return inMemory.data;

  try {
    const raw = await AsyncStorage.getItem(`${CACHE_KEYS.EVENT_DETAIL_PREFIX}${target}`);
    if (!raw) return null;
    const parsed: CacheEnvelope<EventRow> = JSON.parse(raw);
    if (parsed?.data) {
      setBoundedEventDetail(target, parsed);
      if (parsed.data.id) setBoundedEventDetail(parsed.data.id, parsed);
      if (parsed.data.slug) setBoundedEventDetail(parsed.data.slug, parsed);
      return parsed.data;
    }
  } catch (err) {
    console.warn(`[OfflineCache] Failed to load cached event detail (${target}):`, err);
  }
  return null;
}

export async function saveCachedEventDetail(event: EventRow): Promise<void> {
  if (!event || (!event.id && !event.slug)) return;
  const envelope: CacheEnvelope<EventRow> = {
    data: event,
    timestamp: Date.now(),
    version: 1,
  };
  if (event.id) setBoundedEventDetail(event.id, envelope);
  if (event.slug) setBoundedEventDetail(event.slug, envelope);

  try {
    const serialized = JSON.stringify(envelope);
    const writes: [string, string][] = [];
    if (event.id) writes.push([`${CACHE_KEYS.EVENT_DETAIL_PREFIX}${event.id}`, serialized]);
    if (event.slug) writes.push([`${CACHE_KEYS.EVENT_DETAIL_PREFIX}${event.slug}`, serialized]);
    await AsyncStorage.multiSet(writes);
  } catch (err) {
    console.warn('[OfflineCache] Failed to persist event detail:', err);
  }
}

