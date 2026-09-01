import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { ArrowLeft, Trophy, Sparkles, Award, Medal, Crown } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { useAuth } from '../context/AuthContext';
import type { LeaderboardViewRow } from '../types';

export default function LeaderboardScreen() {
  const navigation = useNavigation();
  const { user, profile } = useAuth();

  const [leaderboard, setLeaderboard] = useState<LeaderboardViewRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [myRank, setMyRank] = useState<number | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      // Fetch from leaderboard_view or fallback to profiles ordered by et_score
      const { data, error } = await supabase
        .from('leaderboard_view')
        .select('*')
        .order('et_score', { ascending: false })
        .limit(100);

      if (!error && data && data.length > 0) {
        setLeaderboard(data);
        if (user) {
          const foundIndex = data.findIndex((r) => r.user_id === user.id);
          setMyRank(foundIndex !== -1 ? (data[foundIndex].rank ?? foundIndex + 1) : null);
        }
      } else {
        // Fallback to profiles table
        const { data: profs, error: profError } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, college, et_score')
          .not('et_score', 'is', null)
          .order('et_score', { ascending: false })
          .limit(100);

        if (!profError && profs) {
          const mapped: LeaderboardViewRow[] = profs.map((p, idx) => ({
            user_id: p.id,
            full_name: p.full_name,
            username: p.username,
            avatar_url: p.avatar_url,
            college: p.college,
            et_score: p.et_score,
            rank: idx + 1,
          }));
          setLeaderboard(mapped);
          if (user) {
            const found = mapped.findIndex((m) => m.user_id === user.id);
            setMyRank(found !== -1 ? found + 1 : null);
          }
        }
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

  const topThree = leaderboard.slice(0, 3);
  const restList = leaderboard.slice(3);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Trophy size={20} color="#F59E0B" />
          <Text style={styles.headerTitle}>ET Score Leaderboard</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.brand} />
        </View>
      ) : (
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
                {topThree[1] && (
                  <View style={[styles.podiumColumn, styles.silverColumn]}>
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
                    <Text style={styles.podiumScore}>{topThree[1].et_score || 0} ET</Text>
                    <View style={[styles.podiumPedestal, { height: 75, backgroundColor: '#E2E8F0' }]}>
                      <Medal size={22} color="#64748B" />
                    </View>
                  </View>
                )}

                {/* 1st Place (Center / Tallest) */}
                {topThree[0] && (
                  <View style={[styles.podiumColumn, styles.goldColumn]}>
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
                      {topThree[0].et_score || 0} ET
                    </Text>
                    <View style={[styles.podiumPedestal, { height: 100, backgroundColor: '#FEF3C7' }]}>
                      <Trophy size={28} color="#F59E0B" />
                    </View>
                  </View>
                )}

                {/* 3rd Place */}
                {topThree[2] && (
                  <View style={[styles.podiumColumn, styles.bronzeColumn]}>
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
                    <Text style={styles.podiumScore}>{topThree[2].et_score || 0} ET</Text>
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
              <View style={[styles.rankRow, isMe && styles.rankRowMe]}>
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
                  <Text style={styles.rowScoreText}>{item.et_score || 0} ET</Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Sticky Bottom My Rank Bar */}
      {user && myRank && (
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  listContent: {
    padding: theme.spacing.lg,
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
    borderColor: theme.colors.border,
  },
  goldAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderColor: '#F59E0B',
    borderWidth: 3,
  },
  avatarFallback: {
    backgroundColor: theme.colors.brandLight,
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
    color: theme.colors.textPrimary,
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
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginVertical: 12,
    marginLeft: 4,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
    ...theme.shadows.sm,
  },
  rankRowMe: {
    borderColor: theme.colors.brand,
    backgroundColor: theme.colors.brandLight,
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '900',
    color: theme.colors.textSecondary,
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
    backgroundColor: theme.colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rowAvatarLetter: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.brand,
  },
  rowDetails: {
    flex: 1,
    marginRight: 8,
  },
  rowName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  rowNameMe: {
    color: theme.colors.brand,
    fontWeight: '800',
  },
  rowCollege: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  rowScoreBadge: {
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.md,
  },
  rowScoreText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.brand,
  },
  myRankBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1E1B4B',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...theme.shadows.md,
  },
  myRankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  myRankBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  myRankText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '900',
  },
  myRankTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  myRankSubtitle: {
    color: '#A5B4FC',
    fontSize: 11,
  },
  myScoreText: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: '900',
  },
});
