import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import {
  ArrowLeft,
  Trophy,
  Award,
  Medal,
  Crown,
  AlertCircle,
  Info,
  X,
  Zap,
  ShieldCheck,
  Sparkles,
  Compass,
  GraduationCap,
  MapPin,
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { APP_ASSETS } from '../lib/asset-registry';
import { haptic } from '../lib/haptics';
import { useAuth } from '../context/AuthContext';
import type { LeaderboardViewRow } from '../types';

const DEFAULT_EXCLUDED_EMAILS = ['p.pavansiri@gmail.com', 'eventime.admin@gmail.com'];
const DEFAULT_EXCLUDED_USERNAMES = ['eventime.admin', 'eventimeadmin', 'admin'];

export type CohortType = 'campus' | 'city' | 'all_time';

export default function LeaderboardScreen() {
  const navigation = useNavigation<any>();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pagerRef = useRef<ScrollView>(null);

  const isStudent = profile?.user_type === 'student';
  const userCollege = profile?.college || '';

  // Multi-city support for preferred cities
  const preferredCities = useMemo(() => {
    return profile?.preferred_cities?.length ? profile.preferred_cities : ['Hyderabad'];
  }, [profile?.preferred_cities]);

  const [selectedLeaderboardCity, setSelectedLeaderboardCity] = useState(preferredCities[0]);

  // Keep selected city synced if profile changes
  useEffect(() => {
    if (!preferredCities.includes(selectedLeaderboardCity)) {
      setSelectedLeaderboardCity(preferredCities[0]);
    }
  }, [preferredCities, selectedLeaderboardCity]);

  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [cohortData, setCohortData] = useState<Record<CohortType, LeaderboardViewRow[]>>({
    campus: [],
    city: [],
    all_time: [],
  });
  const [isLeaderboardEnabled, setIsLeaderboardEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showScoreInfo, setShowScoreInfo] = useState(false);

  // Dynamic Cohort Tabs based on user role (strictly role-gated)
  const cohortTabs = useMemo(() => {
    if (isStudent) {
      return [
        { id: 'campus' as CohortType, label: 'Your College' },
        { id: 'city' as CohortType, label: 'City' },
        { id: 'all_time' as CohortType, label: 'All-Time' },
      ];
    }
    return [
      { id: 'city' as CohortType, label: 'City' },
      { id: 'all_time' as CohortType, label: 'All-Time' },
    ];
  }, [isStudent]);

  const activeCohort = cohortTabs[activeTabIndex]?.id || (isStudent ? 'campus' : 'city');

  const fetchCohort = useCallback(
    async (cohort: CohortType, cityOverride?: string) => {
      try {
        const cityTarget = cityOverride || selectedLeaderboardCity;

        // 1. Check if leaderboard is enabled in app_settings
        const { data: settings } = await supabase
          .from('app_settings')
          .select('leaderboard_enabled')
          .eq('id', 1)
          .maybeSingle();

        if (settings && settings.leaderboard_enabled === false) {
          setIsLeaderboardEnabled(false);
          return [];
        }
        setIsLeaderboardEnabled(true);

        // 2. Resolve excluded user IDs
        const rawEnvEmails = process.env.EXPO_PUBLIC_LEADERBOARD_EXCLUDED_EMAILS || '';
        const envEmailList = rawEnvEmails
          .split(',')
          .map((e: string) => e.trim().toLowerCase())
          .filter(Boolean);

        const allExcludedEmails = Array.from(new Set([...DEFAULT_EXCLUDED_EMAILS, ...envEmailList]));

        const { data: excludedProfiles } = await supabase
          .from('profiles')
          .select('id, username, email')
          .in('email', allExcludedEmails);

        const excludedIds = new Set<string>((excludedProfiles || []).map((p) => p.id));

        const { data: excludedByUsername } = await supabase
          .from('profiles')
          .select('id, username')
          .in('username', DEFAULT_EXCLUDED_USERNAMES);

        (excludedByUsername || []).forEach((p) => excludedIds.add(p.id));

        let cleanRows: LeaderboardViewRow[] = [];

        // 3. Cohort-Filtered Queries
        // 3. Cohort-Filtered Queries (Only active contributors > 100 ET)
        if (cohort === 'campus') {
          if (isStudent && userCollege) {
            // Student: query campus-matched profiles with active score > 100 ET
            const { data: collegeProfs, error: collegeErr } = await supabase
              .from('profiles')
              .select('id, full_name, username, avatar_url, college, et_score')
              .ilike('college', `%${userCollege.trim()}%`)
              .gt('et_score', 100)
              .order('et_score', { ascending: false })
              .limit(50);

            if (!collegeErr && collegeProfs && collegeProfs.length > 0) {
              cleanRows = collegeProfs
                .filter((p) => !excludedIds.has(p.id) && (p.et_score ?? 0) > 100)
                .map((p, idx) => ({
                  user_id: p.id,
                  full_name: p.full_name,
                  username: p.username,
                  avatar_url: p.avatar_url,
                  college: p.college,
                  et_score: p.et_score ?? 100,
                  base_score: 100,
                  events_posted: 0,
                  impact_saves: 0,
                  rank: idx + 1,
                }));
            }
          } else {
            // Professional or curator: query active curators/professionals > 100 ET
            const { data: proProfs, error: proErr } = await supabase
              .from('profiles')
              .select('id, full_name, username, avatar_url, college, et_score, user_type')
              .gt('et_score', 100)
              .order('et_score', { ascending: false })
              .limit(50);

            if (!proErr && proProfs && proProfs.length > 0) {
              cleanRows = proProfs
                .filter((p) => !excludedIds.has(p.id) && (p.et_score ?? 0) > 100)
                .map((p, idx) => ({
                  user_id: p.id,
                  full_name: p.full_name,
                  username: p.username,
                  avatar_url: p.avatar_url,
                  college: p.college,
                  et_score: p.et_score ?? 100,
                  base_score: 100,
                  events_posted: 0,
                  impact_saves: 0,
                  rank: idx + 1,
                }));
            }
          }
        } else if (cohort === 'city') {
          if (cityTarget) {
            const { data: cityProfs, error: cityErr } = await supabase
              .from('profiles')
              .select('id, full_name, username, avatar_url, college, et_score, preferred_cities')
              .contains('preferred_cities', [cityTarget])
              .gt('et_score', 100)
              .order('et_score', { ascending: false })
              .limit(50);

            if (!cityErr && cityProfs && cityProfs.length > 0) {
              // Priority 1 Home City filter: curators whose #1 home city is cityTarget
              // If not enough users with #1 city, include all active users with city in preferred_cities
              const homeCityCurators = cityProfs.filter(
                (p) => p.preferred_cities && p.preferred_cities[0] === cityTarget
              );
              const finalCityPool = homeCityCurators.length > 0 ? homeCityCurators : cityProfs;

              cleanRows = finalCityPool
                .filter((p) => !excludedIds.has(p.id) && (p.et_score ?? 0) > 100)
                .map((p, idx) => ({
                  user_id: p.id,
                  full_name: p.full_name,
                  username: p.username,
                  avatar_url: p.avatar_url,
                  college: p.college,
                  et_score: p.et_score ?? 100,
                  base_score: 100,
                  events_posted: 0,
                  impact_saves: 0,
                  rank: idx + 1,
                }));
            }
          }
        } else if (cohort === 'all_time') {
          const { data, error } = await supabase
            .from('leaderboard_view')
            .select('*')
            .gt('et_score', 100)
            .order('et_score', { ascending: false })
            .limit(100);

          if (!error && data && data.length > 0) {
            cleanRows = data
              .filter((r) => r.user_id && !excludedIds.has(r.user_id) && (r.et_score ?? 0) > 100)
              .map((r, idx) => ({
                ...r,
                et_score: r.et_score ?? 100,
                rank: idx + 1,
              }));
          } else {
            const { data: profs, error: profError } = await supabase
              .from('profiles')
              .select('id, full_name, username, avatar_url, college, et_score')
              .gt('et_score', 100)
              .order('et_score', { ascending: false })
              .limit(100);

            if (!profError && profs) {
              cleanRows = profs
                .filter((p) => !excludedIds.has(p.id) && (p.et_score ?? 0) > 100)
                .map((p, idx) => ({
                  user_id: p.id,
                  full_name: p.full_name,
                  username: p.username,
                  avatar_url: p.avatar_url,
                  college: p.college,
                  et_score: p.et_score ?? 100,
                  base_score: 100,
                  events_posted: 0,
                  impact_saves: 0,
                  rank: idx + 1,
                }));
            }
          }
        }

        return cleanRows;
      } catch (err) {
        console.error('Fetch leaderboard error:', err);
        return [];
      }
    },
    [isStudent, userCollege, selectedLeaderboardCity]
  );

  const fetchAllCohorts = useCallback(
    async (cityToUse?: string) => {
      const promises: Promise<any>[] = [];
      if (isStudent) {
        promises.push(fetchCohort('campus'));
      }
      promises.push(fetchCohort('city', cityToUse));
      promises.push(fetchCohort('all_time'));

      const results = await Promise.all(promises);
      if (isStudent) {
        setCohortData({
          campus: results[0] || [],
          city: results[1] || [],
          all_time: results[2] || [],
        });
      } else {
        setCohortData({
          campus: [],
          city: results[0] || [],
          all_time: results[1] || [],
        });
      }
      setIsLoading(false);
      setIsRefreshing(false);
    },
    [fetchCohort, isStudent]
  );

  useEffect(() => {
    setIsLoading(true);
    fetchAllCohorts();
  }, [fetchAllCohorts]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchAllCohorts();
  };

  const handleCitySelect = async (city: string) => {
    if (city === selectedLeaderboardCity) return;
    haptic.selection();
    setSelectedLeaderboardCity(city);
    const cityRows = await fetchCohort('city', city);
    setCohortData((prev) => ({ ...prev, city: cityRows }));
  };

  const handleTabPress = (idx: number) => {
    if (idx === activeTabIndex) return;
    haptic.light();
    setActiveTabIndex(idx);
    pagerRef.current?.scrollTo({ x: idx * width, animated: true });
  };

  const onMomentumScrollEnd = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const newIdx = Math.round(offsetX / width);
    if (newIdx >= 0 && newIdx < cohortTabs.length && newIdx !== activeTabIndex) {
      haptic.light();
      setActiveTabIndex(newIdx);
    }
  };

  const handleCuratorPress = (item: LeaderboardViewRow) => {
    navigation.navigate('CuratorProfile', {
      userId: item.user_id,
      username: item.username,
      name: item.full_name,
    });
  };

  // User metrics for Proximal Rival Card in currently active cohort
  const currentCohortList = cohortData[activeCohort] || [];
  const currentUserEntry = useMemo(
    () => currentCohortList.find((r) => r.user_id === user?.id),
    [currentCohortList, user?.id]
  );

  const userScore = profile?.et_score ?? currentUserEntry?.et_score ?? 100;

  const myRank = useMemo(() => {
    if (!user || userScore <= 100) return null;
    const foundIndex = currentCohortList.findIndex((r) => r.user_id === user.id);
    return foundIndex !== -1 ? foundIndex + 1 : null;
  }, [currentCohortList, user, userScore]);

  // Previous rival (person immediately ahead of user in current cohort)
  const prevRival = useMemo(() => {
    if (!myRank || myRank <= 1) return null;
    return currentCohortList[myRank - 2] || null;
  }, [currentCohortList, myRank]);

  const deltaToPass = useMemo(() => {
    if (!prevRival) return null;
    const rivalScore = prevRival.et_score ?? 100;
    return Math.max(1, rivalScore - userScore + 1);
  }, [prevRival, userScore]);

  // Simple, recognizable rank badges
  const tierBadge = useMemo(() => {
    if (myRank === 1) {
      return { label: 'Rank #1', color: '#B45309', bg: '#FEF3C7' };
    }
    if (myRank && myRank <= 3) {
      return { label: 'Top 3', color: '#D97706', bg: '#FFEDD5' };
    }
    if (myRank && myRank <= 10) {
      return { label: 'Top 10', color: '#6C47FF', bg: '#F5F3FF' };
    }
    if (myRank && myRank <= 25) {
      return { label: 'Top 25', color: '#0284C7', bg: '#E0F2FE' };
    }
    return { label: 'Member', color: '#64748B', bg: '#F1F5F9' };
  }, [myRank]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Trophy size={18} color="#F59E0B" />
          <Text style={styles.headerTitle}>Leaderboard</Text>
        </View>
        <TouchableOpacity
          style={styles.infoBtn}
          onPress={() => setShowScoreInfo(true)}
          activeOpacity={0.7}
        >
          <Info size={18} color={theme.colors.brand} />
        </TouchableOpacity>
      </View>

      {/* Winnable Cohorts Segmented Control */}
      <View style={styles.cohortTrack}>
        {cohortTabs.map((tab, idx) => {
          const isActive = idx === activeTabIndex;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.cohortPill, isActive && styles.cohortPillActive]}
              onPress={() => handleTabPress(idx)}
              activeOpacity={0.7}
            >
              <Text style={[styles.cohortPillText, isActive && styles.cohortPillTextActive]} numberOfLines={1}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Horizontally Swipeable Cohort Pager */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.brand} />
        </View>
      ) : !isLeaderboardEnabled ? (
        <View style={styles.disabledContainer}>
          <AlertCircle size={40} color="#94A3B8" />
          <Text style={styles.disabledTitle}>Leaderboard Unavailable</Text>
          <Text style={styles.disabledSubtitle}>
            The leaderboard is currently undergoing scheduled updates. Please check back soon.
          </Text>
        </View>
      ) : (
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          directionalLockEnabled={true}
          nestedScrollEnabled={true}
          onMomentumScrollEnd={onMomentumScrollEnd}
          style={{ flex: 1 }}
        >
          {cohortTabs.map((tab) => {
            const list = cohortData[tab.id] || [];
            const topThree = list.slice(0, 3);
            const restList = list.slice(3);

            return (
              <View key={tab.id} style={{ width, flex: 1 }}>
                {/* Multi-City Switcher Row (when on City tab with multiple preferred cities) */}
                {tab.id === 'city' && preferredCities.length > 1 && (
                  <View style={styles.citySwitcherContainer}>
                    <Text style={styles.citySwitcherLabel}>YOUR CITIES:</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.cityChipsScroll}
                    >
                      {preferredCities.map((city, cIdx) => {
                        const isCitySelected = city === selectedLeaderboardCity;
                        const isHome = cIdx === 0;
                        return (
                          <TouchableOpacity
                            key={city}
                            style={[styles.cityChip, isCitySelected && styles.cityChipActive]}
                            onPress={() => handleCitySelect(city)}
                            activeOpacity={0.7}
                          >
                            {isHome && (
                              <View style={[styles.cityHomeTag, isCitySelected && styles.cityHomeTagActive]}>
                                <Text style={[styles.cityHomeTagText, isCitySelected && styles.cityHomeTagTextActive]}>
                                  #1 Home
                                </Text>
                              </View>
                            )}
                            <Text
                              style={[
                                styles.cityChipText,
                                isCitySelected && styles.cityChipTextActive,
                              ]}
                            >
                              {city}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Single City Header Banner */}
                {tab.id === 'city' && preferredCities.length === 1 && (
                  <View style={styles.singleCityBanner}>
                    <MapPin size={13} color="#6C47FF" />
                    <Text style={styles.singleCityBannerText}>
                      Home Turf:{' '}
                      <Text style={{ fontFamily: 'Switzer-Bold', color: '#1E293B' }}>
                        {selectedLeaderboardCity}
                      </Text>
                    </Text>
                  </View>
                )}

                {list.length === 0 ? (
                  /* Empty State */
                  <ScrollView
                    contentContainerStyle={styles.emptyContainer}
                    refreshControl={
                      <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={onRefresh}
                        tintColor={theme.colors.brand}
                        colors={[theme.colors.brand]}
                      />
                    }
                  >
                    <Image
                      source={APP_ASSETS.illustrations.throneEmpty}
                      style={styles.emptyIllustration}
                      contentFit="contain"
                    />
                    <Text style={styles.emptyTitle}>
                      {tab.id === 'campus'
                        ? isStudent
                          ? 'No one from your college is ranked yet'
                          : 'No top curators ranked yet'
                        : tab.id === 'city'
                        ? `No rankings in ${selectedLeaderboardCity} yet`
                        : 'Leaderboard is empty'}
                    </Text>
                    <Text style={styles.emptySubtitle}>
                      {tab.id === 'campus'
                        ? isStudent
                          ? 'Share or save an event to be the first one on your college leaderboard!'
                          : 'Be the first curator to rank on EvenTime by curating or saving events!'
                        : tab.id === 'city'
                        ? `Share or save an event in ${selectedLeaderboardCity} to get on the board!`
                        : 'Share or save events to climb up the ranks!'}
                    </Text>
                  </ScrollView>
                ) : (
                  /* Leaderboard View with Podium + Ranks 4+ */
                  <FlatList
                    data={restList}
                    keyExtractor={(item, idx) => item.user_id || String(idx)}
                    contentContainerStyle={[
                      styles.listContent,
                      { paddingBottom: user ? Math.max(insets.bottom, 12) + 90 : 32 },
                    ]}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={8}
                    maxToRenderPerBatch={8}
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
                      <View>
                        {/* Podium for Top 3 */}
                        <View style={styles.podiumContainer}>
                          {/* 2nd Place */}
                          {topThree[1] ? (
                            <TouchableOpacity
                              style={[styles.podiumColumn, styles.silverColumn]}
                              onPress={() => handleCuratorPress(topThree[1])}
                              activeOpacity={0.8}
                            >
                              <View style={styles.podiumAvatarWrap}>
                                {topThree[1].avatar_url ? (
                                  <Image
                                    source={{ uri: topThree[1].avatar_url }}
                                    style={styles.podiumAvatar}
                                  />
                                ) : (
                                  <View style={[styles.podiumAvatar, styles.avatarFallback]}>
                                    <Text style={styles.avatarLetter}>
                                      {topThree[1].full_name?.charAt(0) || '2'}
                                    </Text>
                                  </View>
                                )}
                                <View style={[styles.rankBadge, { backgroundColor: '#94A3B8' }]}>
                                  <Text style={styles.rankBadgeText}>2</Text>
                                </View>
                              </View>
                              <Text style={styles.podiumName} numberOfLines={1}>
                                {topThree[1].full_name || topThree[1].username || 'Member'}
                              </Text>
                              <Text style={styles.podiumScore}>{topThree[1].et_score || 100} ET</Text>
                              <View
                                style={[
                                  styles.podiumPedestal,
                                  { height: 75, backgroundColor: '#E2E8F0' },
                                ]}
                              >
                                <Text style={styles.podiumPedestalNumber}>2</Text>
                              </View>
                            </TouchableOpacity>
                          ) : (
                            <View style={[styles.podiumColumn, styles.silverColumn, { opacity: 0.35 }]}>
                              <View style={styles.podiumAvatarWrap}>
                                <View style={[styles.podiumAvatar, styles.avatarFallback]}>
                                  <Text style={styles.avatarLetter}>2</Text>
                                </View>
                              </View>
                              <Text style={styles.podiumName}>Open</Text>
                              <Text style={styles.podiumScore}>-</Text>
                              <View
                                style={[
                                  styles.podiumPedestal,
                                  { height: 75, backgroundColor: '#E2E8F0' },
                                ]}
                              >
                                <Text style={styles.podiumPedestalNumber}>2</Text>
                              </View>
                            </View>
                          )}

                          {/* 1st Place (Center / Tallest) */}
                          {topThree[0] ? (
                            <TouchableOpacity
                              style={[styles.podiumColumn, styles.goldColumn]}
                              onPress={() => handleCuratorPress(topThree[0])}
                              activeOpacity={0.8}
                            >
                              <View style={styles.podiumAvatarWrap}>
                                {topThree[0].avatar_url ? (
                                  <Image
                                    source={{ uri: topThree[0].avatar_url }}
                                    style={[styles.podiumAvatar, styles.goldAvatar]}
                                  />
                                ) : (
                                  <View
                                    style={[
                                      styles.podiumAvatar,
                                      styles.goldAvatar,
                                      styles.avatarFallback,
                                    ]}
                                  >
                                    <Text style={styles.avatarLetter}>
                                      {topThree[0].full_name?.charAt(0) || '1'}
                                    </Text>
                                  </View>
                                )}
                                <View style={[styles.rankBadge, { backgroundColor: '#F59E0B' }]}>
                                  <Text style={styles.rankBadgeText}>1</Text>
                                </View>
                              </View>
                              <Text style={[styles.podiumName, { fontWeight: '900' }]} numberOfLines={1}>
                                {topThree[0].full_name || topThree[0].username || 'Member'}
                              </Text>
                              <Text style={[styles.podiumScore, { color: '#B45309', fontWeight: '900' }]}>
                                {topThree[0].et_score || 100} ET
                              </Text>
                              <View
                                style={[
                                  styles.podiumPedestal,
                                  { height: 100, backgroundColor: '#FEF3C7' },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.podiumPedestalNumber,
                                    { color: '#B45309', fontSize: 26 },
                                  ]}
                                >
                                  1
                                </Text>
                              </View>
                            </TouchableOpacity>
                          ) : (
                            <View style={[styles.podiumColumn, styles.goldColumn, { opacity: 0.35 }]}>
                              <View style={styles.podiumAvatarWrap}>
                                <View
                                  style={[
                                    styles.podiumAvatar,
                                    styles.goldAvatar,
                                    styles.avatarFallback,
                                  ]}
                                >
                                  <Text style={styles.avatarLetter}>1</Text>
                                </View>
                              </View>
                              <Text style={[styles.podiumName, { fontWeight: '900' }]}>Open</Text>
                              <Text style={[styles.podiumScore, { color: '#B45309' }]}>-</Text>
                              <View
                                style={[
                                  styles.podiumPedestal,
                                  { height: 100, backgroundColor: '#FEF3C7' },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.podiumPedestalNumber,
                                    { color: '#B45309', fontSize: 26 },
                                  ]}
                                >
                                  1
                                </Text>
                              </View>
                            </View>
                          )}

                          {/* 3rd Place */}
                          {topThree[2] ? (
                            <TouchableOpacity
                              style={[styles.podiumColumn, styles.bronzeColumn]}
                              onPress={() => handleCuratorPress(topThree[2])}
                              activeOpacity={0.8}
                            >
                              <View style={styles.podiumAvatarWrap}>
                                {topThree[2].avatar_url ? (
                                  <Image
                                    source={{ uri: topThree[2].avatar_url }}
                                    style={styles.podiumAvatar}
                                  />
                                ) : (
                                  <View style={[styles.podiumAvatar, styles.avatarFallback]}>
                                    <Text style={styles.avatarLetter}>
                                      {topThree[2].full_name?.charAt(0) || '3'}
                                    </Text>
                                  </View>
                                )}
                                <View style={[styles.rankBadge, { backgroundColor: '#D97706' }]}>
                                  <Text style={styles.rankBadgeText}>3</Text>
                                </View>
                              </View>
                              <Text style={styles.podiumName} numberOfLines={1}>
                                {topThree[2].full_name || topThree[2].username || 'Member'}
                              </Text>
                              <Text style={styles.podiumScore}>{topThree[2].et_score || 100} ET</Text>
                              <View
                                style={[
                                  styles.podiumPedestal,
                                  { height: 55, backgroundColor: '#FFEDD5' },
                                ]}
                              >
                                <Text style={[styles.podiumPedestalNumber, { color: '#D97706' }]}>
                                  3
                                </Text>
                              </View>
                            </TouchableOpacity>
                          ) : (
                            <View style={[styles.podiumColumn, styles.bronzeColumn, { opacity: 0.35 }]}>
                              <View style={styles.podiumAvatarWrap}>
                                <View style={[styles.podiumAvatar, styles.avatarFallback]}>
                                  <Text style={styles.avatarLetter}>3</Text>
                                </View>
                              </View>
                              <Text style={styles.podiumName}>Open</Text>
                              <Text style={styles.podiumScore}>-</Text>
                              <View
                                style={[
                                  styles.podiumPedestal,
                                  { height: 55, backgroundColor: '#FFEDD5' },
                                ]}
                              >
                                <Text style={[styles.podiumPedestalNumber, { color: '#D97706' }]}>
                                  3
                                </Text>
                              </View>
                            </View>
                          )}
                        </View>

                        {/* Ranks 4+ List Header */}
                        {restList.length > 0 && (
                          <Text style={styles.listSectionTitle}>
                            {tab.id === 'campus'
                              ? isStudent
                                ? 'College Leaderboard'
                                : 'Top Curators'
                              : tab.id === 'city'
                              ? `Top in ${selectedLeaderboardCity}`
                              : 'Top Ranked'}
                          </Text>
                        )}
                      </View>
                    }
                    renderItem={({ item, index }) => {
                      const rank = item.rank ?? index + 4;
                      const isMe = user?.id === item.user_id;
                      return (
                        <TouchableOpacity
                          style={[styles.rankRow, isMe && styles.rankRowMe]}
                          onPress={() => handleCuratorPress(item)}
                        >
                          <Text style={[styles.rankNumber, isMe && styles.rankNumberMe]}>
                            #{rank}
                          </Text>

                          {item.avatar_url ? (
                            <Image source={{ uri: item.avatar_url }} style={styles.rowAvatar} />
                          ) : (
                            <View style={styles.rowAvatarFallback}>
                              <Text style={styles.rowAvatarLetter}>
                                {item.full_name ? item.full_name.charAt(0).toUpperCase() : 'U'}
                              </Text>
                            </View>
                          )}

                          <View style={styles.rowDetails}>
                            <Text
                              style={[styles.rowName, isMe && styles.rowNameMe]}
                              numberOfLines={1}
                            >
                              {item.full_name || item.username || 'Member'} {isMe ? '(You)' : ''}
                            </Text>
                            {item.college && (
                              <Text style={styles.rowCollege} numberOfLines={1}>
                                {item.college}
                              </Text>
                            )}
                          </View>

                          <View style={styles.rowScoreBadge}>
                            <Text style={styles.rowScoreText}>{item.et_score || 100} ET</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                  />
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Sticky Bottom Proximal Rival Card */}
      {user && isLeaderboardEnabled && (
        <View
          style={[
            styles.rivalCard,
            { paddingBottom: Math.max(insets.bottom, 12) + 4 },
          ]}
        >
          <View style={styles.rivalLeft}>
            <View style={[styles.rivalRankBadge, myRank === 1 && styles.rivalRankBadgeGold]}>
              <Text style={styles.rivalRankText}>{myRank ? `#${myRank}` : '—'}</Text>
            </View>

            <View style={styles.rivalCenter}>
              <View style={styles.rivalHeaderRow}>
                <Text style={styles.rivalTitle}>
                  {myRank === 1 ? 'You · Rank #1' : myRank ? `You · #${myRank}` : 'You · Unranked'}
                </Text>
                <View style={[styles.tierPill, { backgroundColor: tierBadge.bg }]}>
                  <Text style={[styles.tierPillText, { color: tierBadge.color }]}>
                    {tierBadge.label}
                  </Text>
                </View>
              </View>

              {myRank === 1 ? (
                <Text style={styles.rivalSubtitle}>
                  You're in 1st place! Keep sharing events to stay on top.
                </Text>
              ) : prevRival && deltaToPass ? (
                <View style={styles.rivalDeltaRow}>
                  <Text style={styles.rivalSubtitle} numberOfLines={1}>
                    Just <Text style={styles.rivalHighlight}>{deltaToPass} ET</Text> more to pass @
                    {prevRival.username || prevRival.full_name || 'user'} for #{myRank! - 1}
                  </Text>
                </View>
              ) : activeCohort === 'city' && selectedLeaderboardCity !== preferredCities[0] ? (
                <Text style={styles.rivalSubtitle}>
                  Viewing {selectedLeaderboardCity}. Your Home Turf is {preferredCities[0]}.
                </Text>
              ) : userScore <= 100 ? (
                <Text style={styles.rivalSubtitle}>
                  Save or share an event (+10 ET) to earn points and claim your spot on the leaderboard.
                </Text>
              ) : (
                <Text style={styles.rivalSubtitle}>
                  Save or share events to climb up the leaderboard ranks.
                </Text>
              )}
            </View>
          </View>

          <View style={styles.rivalScoreWrap}>
            <Text style={styles.rivalScoreText}>{userScore} ET</Text>
          </View>
        </View>
      )}

      {/* How ET Score Works Modal (Tap anywhere outside to close) */}
      <Modal visible={showScoreInfo} transparent animationType="fade" onRequestClose={() => setShowScoreInfo(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowScoreInfo(false)}
        >
          <TouchableOpacity
            style={styles.scoreModalCard}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation?.()}
          >
            <View style={styles.scoreModalHeader}>
              <Text style={styles.scoreModalTitle}>How Points Work</Text>
              <TouchableOpacity style={styles.scoreModalClose} onPress={() => setShowScoreInfo(false)}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.scoreRowsList}>
              <View style={styles.scoreRow}>
                <View style={styles.scoreRowLeft}>
                  <Text style={styles.scoreRowLabel}>Sign-up Bonus</Text>
                  <Text style={styles.scoreRowDesc}>Given when you create your account</Text>
                </View>
                <Text style={styles.scoreRowValue}>+100</Text>
              </View>
              <View style={styles.scoreRow}>
                <View style={styles.scoreRowLeft}>
                  <Text style={styles.scoreRowLabel}>Complete Profile</Text>
                  <Text style={styles.scoreRowDesc}>Set up your city and interests</Text>
                </View>
                <Text style={styles.scoreRowValue}>+50</Text>
              </View>
              <View style={styles.scoreRow}>
                <View style={styles.scoreRowLeft}>
                  <Text style={styles.scoreRowLabel}>Share an Event</Text>
                  <Text style={styles.scoreRowDesc}>When your posted event gets approved</Text>
                </View>
                <Text style={styles.scoreRowValue}>+100</Text>
              </View>
              <View style={styles.scoreRow}>
                <View style={styles.scoreRowLeft}>
                  <Text style={styles.scoreRowLabel}>Someone Interested</Text>
                  <Text style={styles.scoreRowDesc}>When someone marks 'Interested' on your event</Text>
                </View>
                <Text style={styles.scoreRowValue}>+25</Text>
              </View>
              <View style={styles.scoreRow}>
                <View style={styles.scoreRowLeft}>
                  <Text style={styles.scoreRowLabel}>Someone Saves</Text>
                  <Text style={styles.scoreRowDesc}>When someone bookmarks your event</Text>
                </View>
                <Text style={styles.scoreRowValue}>+10</Text>
              </View>
              <View style={[styles.scoreRow, { borderBottomWidth: 0 }]}>
                <View style={styles.scoreRowLeft}>
                  <Text style={styles.scoreRowLabel}>Spam or Fake Event</Text>
                  <Text style={styles.scoreRowDesc}>Penalty if a posted event is fake or misleading</Text>
                </View>
                <Text style={[styles.scoreRowValue, { color: '#EF4444' }]}>−25</Text>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  disabledContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  disabledTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 6,
  },
  disabledSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    padding: 6,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: '#0F172A',
  },
  infoBtn: {
    padding: 6,
  },
  // Winnable Cohorts Segmented Control
  cohortTrack: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 4,
    borderRadius: 14,
  },
  cohortPill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  cohortPillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cohortPillText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 13,
    color: '#64748B',
  },
  cohortPillTextActive: {
    color: '#0F172A',
  },
  // Multi-City Switcher Container
  citySwitcherContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  citySwitcherLabel: {
    fontFamily: 'Switzer-Bold',
    fontSize: 10,
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginRight: 8,
  },
  cityChipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cityChipActive: {
    backgroundColor: theme.colors.brand,
    borderColor: theme.colors.brand,
  },
  cityHomeTag: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  cityHomeTagActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  cityHomeTagText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 9,
    color: '#475569',
  },
  cityHomeTagTextActive: {
    color: '#FFFFFF',
  },
  singleCityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  singleCityBannerText: {
    fontFamily: 'Switzer-Regular',
    fontSize: 12,
    color: '#64748B',
  },
  cityChipText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: '#64748B',
  },
  cityChipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  // Top 3 Visual Podium
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
    gap: 12,
  },
  podiumColumn: {
    flex: 1,
    alignItems: 'center',
  },
  goldColumn: {
    transform: [{ translateY: -10 }],
  },
  silverColumn: {},
  bronzeColumn: {},
  podiumAvatarWrap: {
    position: 'relative',
    marginBottom: 6,
  },
  podiumAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#94A3B8',
  },
  goldAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderColor: '#F59E0B',
    borderWidth: 3,
  },
  avatarFallback: {
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    color: '#475569',
  },
  rankBadge: {
    position: 'absolute',
    bottom: -4,
    alignSelf: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  rankBadgeText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  podiumName: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: '#0F172A',
    marginBottom: 2,
    textAlign: 'center',
  },
  podiumScore: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
    color: '#475569',
    marginBottom: 6,
  },
  podiumPedestal: {
    width: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumPedestalNumber: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    color: '#64748B',
    opacity: 0.8,
  },
  listSectionTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 6,
  },
  // Ranks 4+ Row Items
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  rankRowMe: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  rankNumber: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    color: '#64748B',
    width: 34,
  },
  rankNumberMe: {
    color: theme.colors.brand,
  },
  rowAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  rowAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowAvatarLetter: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: '#475569',
  },
  rowDetails: {
    flex: 1,
    marginRight: 8,
  },
  rowName: {
    fontFamily: 'Switzer-Bold',
    fontSize: 14,
    color: '#0F172A',
  },
  rowNameMe: {
    color: theme.colors.brand,
  },
  rowCollege: {
    fontFamily: 'Switzer-Regular',
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  rowScoreBadge: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  rowScoreText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: '#D97706',
  },
  emptyContainer: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  emptyIllustration: {
    width: 230,
    height: 230,
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 19,
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Switzer-Regular',
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Sticky Bottom Proximal Rival Card
  rivalCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  rivalLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 10,
  },
  rivalRankBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rivalRankBadgeGold: {
    backgroundColor: '#F59E0B',
  },
  rivalRankText: {
    fontFamily: 'Switzer-Bold',
    color: '#FFF',
    fontSize: 12,
  },
  rivalCenter: {
    flex: 1,
  },
  rivalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  rivalTitle: {
    fontFamily: 'Switzer-Bold',
    fontSize: 13,
    color: '#FFF',
  },
  tierPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tierPillText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 9,
    textTransform: 'uppercase',
  },
  rivalSubtitle: {
    fontFamily: 'Switzer-Regular',
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 15,
  },
  rivalDeltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rivalHighlight: {
    color: '#38BDF8',
    fontFamily: 'Switzer-Bold',
  },
  rivalScoreWrap: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  rivalScoreText: {
    fontFamily: 'Outfit-Bold',
    color: '#F59E0B',
    fontSize: 13,
  },
  // Points Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scoreModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  scoreModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  scoreModalTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: '#0F172A',
  },
  scoreModalClose: {
    padding: 4,
  },
  scoreRowsList: {
    gap: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  scoreRowLeft: {
    flex: 1,
    marginRight: 12,
  },
  scoreRowLabel: {
    fontFamily: 'Switzer-Bold',
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 2,
  },
  scoreRowDesc: {
    fontFamily: 'Switzer-Regular',
    fontSize: 11,
    color: '#64748B',
  },
  scoreRowValue: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    color: '#10B981',
  },
});
