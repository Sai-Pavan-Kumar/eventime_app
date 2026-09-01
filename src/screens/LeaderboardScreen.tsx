import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { ArrowLeft, Trophy, Award, Medal, Crown, AlertCircle, Info, X } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { APP_ASSETS } from '../lib/asset-registry';
import { useAuth } from '../context/AuthContext';
import type { LeaderboardViewRow } from '../types';

const DEFAULT_EXCLUDED_EMAILS = ['p.pavansiri@gmail.com', 'eventime.admin@gmail.com'];
const DEFAULT_EXCLUDED_USERNAMES = ['eventime.admin', 'eventimeadmin', 'admin'];

export default function LeaderboardScreen() {
  const navigation = useNavigation<any>();
  const { user, profile } = useAuth();

  const [leaderboard, setLeaderboard] = useState<LeaderboardViewRow[]>([]);
  const [isLeaderboardEnabled, setIsLeaderboardEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [showScoreInfo, setShowScoreInfo] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    try {
      // 1. Check if leaderboard is enabled in app_settings
      const { data: settings } = await supabase
        .from('app_settings')
        .select('leaderboard_enabled')
        .eq('id', 1)
        .maybeSingle();

      if (settings && settings.leaderboard_enabled === false) {
        setIsLeaderboardEnabled(false);
        setIsLoading(false);
        return;
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

      // Also add profiles matching default excluded usernames
      const { data: excludedByUsername } = await supabase
        .from('profiles')
        .select('id, username')
        .in('username', DEFAULT_EXCLUDED_USERNAMES);

      (excludedByUsername || []).forEach((p) => excludedIds.add(p.id));

      // 3. Fetch from leaderboard_view
      const { data, error } = await supabase
        .from('leaderboard_view')
        .select('*')
        .order('et_score', { ascending: false })
        .limit(100);

      let cleanRows: LeaderboardViewRow[] = [];

      if (!error && data && data.length > 0) {
        cleanRows = data
          .filter((r) => r.user_id && !excludedIds.has(r.user_id))
          .map((r, idx) => ({
            ...r,
            et_score: r.et_score ?? 100,
            rank: idx + 1,
          }));
      } else {
        // Fallback to profiles table
        const { data: profs, error: profError } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, college, et_score')
          .order('et_score', { ascending: false })
          .limit(100);

        if (!profError && profs) {
          cleanRows = profs
            .filter((p) => !excludedIds.has(p.id))
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

      setLeaderboard(cleanRows);

      if (user) {
        const foundIndex = cleanRows.findIndex((r) => r.user_id === user.id);
        setMyRank(foundIndex !== -1 ? foundIndex + 1 : null);
      }
    } catch (err) {
      console.error('Fetch leaderboard error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchLeaderboard();
  };

  const handleCuratorPress = (item: LeaderboardViewRow) => {
    navigation.navigate('CuratorProfile', {
      userId: item.user_id,
      username: item.username,
      name: item.full_name,
    });
  };

  const topThree = leaderboard.slice(0, 3);
  const restList = leaderboard.slice(3);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Trophy size={18} color="#F59E0B" />
          <Text style={styles.headerTitle}>Top Curators</Text>
        </View>
        <TouchableOpacity
          style={styles.infoBtn}
          onPress={() => setShowScoreInfo(true)}
          activeOpacity={0.7}
        >
          <Info size={18} color={theme.colors.brand} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.brand} />
        </View>
      ) : !isLeaderboardEnabled ? (
        <View style={styles.disabledContainer}>
          <AlertCircle size={40} color="#94A3B8" />
          <Text style={styles.disabledTitle}>Leaderboard Unavailable</Text>
          <Text style={styles.disabledSubtitle}>
            The curator leaderboard is currently undergoing scheduled updates. Please check back later.
          </Text>
        </View>
      ) : leaderboard.length === 0 ? (
        /* Empty State: Only shown when absolutely no curators exist */
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
          <Text style={styles.emptyTitle}>The Throne is Empty!</Text>
          <Text style={styles.emptySubtitle}>
            There are currently no curators ranked on the leaderboard. Be the first to post approved events and claim the #1 spot!
          </Text>
        </ScrollView>
      ) : (
        /* Leaderboard View with Podium + Ranks 4+ */
        <FlatList
          data={restList}
          keyExtractor={(item, idx) => item.user_id || String(idx)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
                        <Image source={{ uri: topThree[1].avatar_url }} style={styles.podiumAvatar} />
                      ) : (
                        <View style={[styles.podiumAvatar, styles.avatarFallback]}>
                          <Text style={styles.avatarLetter}>{topThree[1].full_name?.charAt(0) || '2'}</Text>
                        </View>
                      )}
                      <View style={[styles.rankBadge, { backgroundColor: '#94A3B8' }]}>
                        <Text style={styles.rankBadgeText}>2</Text>
                      </View>
                    </View>
                    <Text style={styles.podiumName} numberOfLines={1}>
                      {topThree[1].full_name || topThree[1].username || 'Curator'}
                    </Text>
                    <Text style={styles.podiumScore}>{topThree[1].et_score || 100} ET</Text>
                    <View style={[styles.podiumPedestal, { height: 75, backgroundColor: '#E2E8F0' }]}>
                      <Medal size={22} color="#64748B" />
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.podiumColumn, styles.silverColumn, { opacity: 0.35 }]}>
                    <View style={[styles.podiumAvatarWrap]}>
                      <View style={[styles.podiumAvatar, styles.avatarFallback]}>
                        <Text style={styles.avatarLetter}>2</Text>
                      </View>
                    </View>
                    <Text style={styles.podiumName}>Open</Text>
                    <Text style={styles.podiumScore}>-</Text>
                    <View style={[styles.podiumPedestal, { height: 75, backgroundColor: '#E2E8F0' }]}>
                      <Medal size={22} color="#64748B" />
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
                    <Crown size={24} color="#F59E0B" style={{ marginBottom: -6 }} />
                    <View style={styles.podiumAvatarWrap}>
                      {topThree[0].avatar_url ? (
                        <Image source={{ uri: topThree[0].avatar_url }} style={[styles.podiumAvatar, styles.goldAvatar]} />
                      ) : (
                        <View style={[styles.podiumAvatar, styles.goldAvatar, styles.avatarFallback]}>
                          <Text style={styles.avatarLetter}>{topThree[0].full_name?.charAt(0) || '1'}</Text>
                        </View>
                      )}
                      <View style={[styles.rankBadge, { backgroundColor: '#F59E0B' }]}>
                        <Text style={styles.rankBadgeText}>1</Text>
                      </View>
                    </View>
                    <Text style={[styles.podiumName, { fontWeight: '900' }]} numberOfLines={1}>
                      {topThree[0].full_name || topThree[0].username || 'Curator'}
                    </Text>
                    <Text style={[styles.podiumScore, { color: '#B45309', fontWeight: '900' }]}>
                      {topThree[0].et_score || 100} ET
                    </Text>
                    <View style={[styles.podiumPedestal, { height: 100, backgroundColor: '#FEF3C7' }]}>
                      <Trophy size={28} color="#F59E0B" />
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.podiumColumn, styles.goldColumn, { opacity: 0.35 }]}>
                    <Crown size={24} color="#F59E0B" style={{ marginBottom: -6 }} />
                    <View style={styles.podiumAvatarWrap}>
                      <View style={[styles.podiumAvatar, styles.goldAvatar, styles.avatarFallback]}>
                        <Text style={styles.avatarLetter}>1</Text>
                      </View>
                    </View>
                    <Text style={[styles.podiumName, { fontWeight: '900' }]}>Open</Text>
                    <Text style={[styles.podiumScore, { color: '#B45309' }]}>-</Text>
                    <View style={[styles.podiumPedestal, { height: 100, backgroundColor: '#FEF3C7' }]}>
                      <Trophy size={28} color="#F59E0B" />
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
                        <Image source={{ uri: topThree[2].avatar_url }} style={styles.podiumAvatar} />
                      ) : (
                        <View style={[styles.podiumAvatar, styles.avatarFallback]}>
                          <Text style={styles.avatarLetter}>{topThree[2].full_name?.charAt(0) || '3'}</Text>
                        </View>
                      )}
                      <View style={[styles.rankBadge, { backgroundColor: '#D97706' }]}>
                        <Text style={styles.rankBadgeText}>3</Text>
                      </View>
                    </View>
                    <Text style={styles.podiumName} numberOfLines={1}>
                      {topThree[2].full_name || topThree[2].username || 'Curator'}
                    </Text>
                    <Text style={styles.podiumScore}>{topThree[2].et_score || 100} ET</Text>
                    <View style={[styles.podiumPedestal, { height: 55, backgroundColor: '#FFEDD5' }]}>
                      <Award size={20} color="#D97706" />
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.podiumColumn, styles.bronzeColumn, { opacity: 0.35 }]}>
                    <View style={[styles.podiumAvatarWrap]}>
                      <View style={[styles.podiumAvatar, styles.avatarFallback]}>
                        <Text style={styles.avatarLetter}>3</Text>
                      </View>
                    </View>
                    <Text style={styles.podiumName}>Open</Text>
                    <Text style={styles.podiumScore}>-</Text>
                    <View style={[styles.podiumPedestal, { height: 55, backgroundColor: '#FFEDD5' }]}>
                      <Award size={20} color="#D97706" />
                    </View>
                  </View>
                )}
              </View>

              {/* Ranks 4+ List Header */}
              {restList.length > 0 && (
                <Text style={styles.listSectionTitle}>All Top Curators</Text>
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
                activeOpacity={0.7}
              >
                <Text style={[styles.rankNumber, isMe && styles.rankNumberMe]}>#{rank}</Text>

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
                  <Text style={[styles.rowName, isMe && styles.rowNameMe]} numberOfLines={1}>
                    {item.full_name || item.username || 'Curator'} {isMe ? '(You)' : ''}
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

      {/* Sticky Bottom My Rank Bar */}
      {user && myRank && isLeaderboardEnabled && (
        <View style={styles.myRankBar}>
          <View style={styles.myRankLeft}>
            <View style={styles.myRankBadge}>
              <Text style={styles.myRankText}>#{myRank}</Text>
            </View>
            <View>
              <Text style={styles.myRankTitle}>Your Current Rank</Text>
              <Text style={styles.myRankSubtitle}>Keep curating events to climb higher!</Text>
            </View>
          </View>
          <Text style={styles.myScoreText}>{profile?.et_score || 100} ET</Text>
        </View>
      )}

      {/* How ET Score Works Modal */}
      <Modal visible={showScoreInfo} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.scoreModalCard}>
            <View style={styles.scoreModalHeader}>
              <Text style={styles.scoreModalTitle}>How ET Score Works</Text>
              <TouchableOpacity style={styles.scoreModalClose} onPress={() => setShowScoreInfo(false)}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.scoreRowsList}>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreRowLabel}>Base score</Text>
                <Text style={styles.scoreRowValue}>+100</Text>
              </View>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreRowLabel}>Completing your profile</Text>
                <Text style={styles.scoreRowValue}>+50 (one-time)</Text>
              </View>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreRowLabel}>Each approved event</Text>
                <Text style={styles.scoreRowValue}>+20</Text>
              </View>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreRowLabel}>Each unique save/interest</Text>
                <Text style={styles.scoreRowValue}>+10</Text>
              </View>
              <View style={[styles.scoreRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.scoreRowLabel}>Confirmed spam report</Text>
                <Text style={[styles.scoreRowValue, { color: '#EF4444' }]}>−25</Text>
              </View>
            </View>
          </View>
        </View>
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginVertical: 18,
    gap: 8,
  },
  podiumColumn: {
    flex: 1,
    alignItems: 'center',
  },
  goldColumn: {
    flex: 1.1,
  },
  silverColumn: {},
  bronzeColumn: {},
  podiumAvatarWrap: {
    position: 'relative',
    marginBottom: 6,
  },
  podiumAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  goldAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderColor: '#F59E0B',
    borderWidth: 3,
  },
  avatarFallback: {
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.brand,
  },
  rankBadge: {
    position: 'absolute',
    bottom: -4,
    alignSelf: 'center',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '900',
  },
  podiumName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    maxWidth: 90,
  },
  podiumScore: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.brand,
    marginBottom: 8,
  },
  podiumPedestal: {
    width: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginVertical: 14,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rankRowMe: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#94A3B8',
    width: 32,
  },
  rankNumberMe: {
    color: theme.colors.brand,
  },
  rowAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  rowAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rowAvatarLetter: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  rowDetails: {
    flex: 1,
  },
  rowName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  rowNameMe: {
    color: theme.colors.brand,
  },
  rowCollege: {
    fontSize: 11,
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
    fontSize: 12,
    fontWeight: '800',
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
    width: 160,
    height: 160,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  myRankBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  myRankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  myRankBadge: {
    backgroundColor: theme.colors.brand,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  myRankText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  myRankTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  myRankSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
  },
  myScoreText: {
    color: '#F59E0B',
    fontSize: 15,
    fontWeight: '900',
  },
  infoBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scoreModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  scoreModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  scoreModalTitle: {
    fontSize: 17,
    fontWeight: '800',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  scoreRowLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
    flex: 1,
  },
  scoreRowValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
});
