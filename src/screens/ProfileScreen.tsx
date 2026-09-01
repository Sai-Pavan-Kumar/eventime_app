import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import {
  User,
  Settings,
  Bookmark,
  Calendar,
  Trophy,
  Shield,
  LogOut,
  ChevronRight,
  MapPin,
  GraduationCap,
  Heart,
  CheckCircle,
  MessageSquare,
  Sparkles,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { FeedbackModal } from '../components/FeedbackModal';
import type { RootStackParamList } from '../types';

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, profile, isAdmin, signOut, refreshProfile } = useAuth();

  const [createdEventsCount, setCreatedEventsCount] = useState(0);
  const [totalSavesCount, setTotalSavesCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!user) {
      setIsLoadingStats(false);
      return;
    }
    try {
      // 1. Created events count & total saves
      const { data: myEvents } = await supabase
        .from('events')
        .select('id, saved_events(count)')
        .eq('creator_id', user.id);

      if (myEvents) {
        setCreatedEventsCount(myEvents.length);
        let saves = 0;
        myEvents.forEach((ev: any) => {
          saves += ev.saved_events?.[0]?.count || 0;
        });
        setTotalSavesCount(saves);
      }

      // 2. Saved events count
      const { count: bookmarkCount } = await supabase
        .from('saved_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setSavedCount(bookmarkCount || 0);
    } catch (err) {
      console.error('Fetch profile stats error:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Profile completion calculation
  const calculateCompletion = () => {
    if (!profile) return 0;
    let score = 0;
    if (profile.username) score += 25;
    if (profile.preferred_cities && profile.preferred_cities.length > 0) score += 25;
    if (profile.goals && profile.goals.length > 0) score += 25;
    if (profile.user_type === 'student') {
      if (profile.college) score += 25;
    } else {
      score += 25;
    }
    return score;
  };

  const completion = calculateCompletion();

  // Tier calculation
  const getTierInfo = () => {
    if (createdEventsCount >= 69) {
      return { label: 'Gold Curator', color: '#F59E0B', bg: '#FEF3C7' };
    }
    if (createdEventsCount >= 30) {
      return { label: 'Silver Curator', color: '#64748B', bg: '#F1F5F9' };
    }
    return { label: 'Curator', color: theme.colors.brand, bg: theme.colors.brandLight };
  };

  const tier = getTierInfo();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of EvenTime?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.guestContainer}>
          <View style={styles.guestIconBg}>
            <User size={36} color={theme.colors.brand} />
          </View>
          <Text style={styles.guestTitle}>Sign in to EvenTime</Text>
          <Text style={styles.guestSubtitle}>
            Save events, track campus activities, create events, and climb the ET Score leaderboard.
          </Text>
          <TouchableOpacity
            style={styles.signInBtn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.signInBtnText}>Sign In / Register</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>
                  {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}

            <View style={styles.profileDetails}>
              <View style={styles.nameRow}>
                <Text style={styles.fullName}>{profile?.full_name || 'EvenTime User'}</Text>
                {isAdmin && (
                  <View style={styles.adminBadge}>
                    <Shield size={10} color="#FFF" />
                    <Text style={styles.adminBadgeText}>ADMIN</Text>
                  </View>
                )}
              </View>

              <Text style={styles.username}>@{profile?.username || 'user'}</Text>

              {/* Tier Pill */}
              <View style={[styles.tierPill, { backgroundColor: tier.bg }]}>
                <Text style={[styles.tierText, { color: tier.color }]}>{tier.label}</Text>
                <Text style={[styles.scoreText, { color: tier.color }]}>• {profile?.et_score || 100} ET</Text>
              </View>
            </View>
          </View>

          {/* Academic metadata */}
          {profile?.user_type === 'student' && profile?.college && (
            <View style={styles.academicRow}>
              <GraduationCap size={14} color={theme.colors.textSecondary} />
              <Text style={styles.academicText} numberOfLines={1}>
                {profile.college} {profile.branch ? `• ${profile.branch}` : ''}{' '}
                {profile.graduation_year ? `('${profile.graduation_year.slice(-2)})` : ''}
              </Text>
            </View>
          )}

          {/* Goals / Interests */}
          {profile?.goals && profile.goals.length > 0 && (
            <View style={styles.goalsRow}>
              {profile.goals.slice(0, 3).map((g, idx) => (
                <View key={idx} style={styles.goalChip}>
                  <Text style={styles.goalChipText}>{g}</Text>
                </View>
              ))}
              {profile.goals.length > 3 && (
                <Text style={styles.moreGoalsText}>+{profile.goals.length - 3} more</Text>
              )}
            </View>
          )}

          {/* Profile Completion Bar (if < 100%) */}
          {completion < 100 && (
            <TouchableOpacity
              style={styles.completionCard}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.8}
            >
              <View style={styles.completionHeader}>
                <Text style={styles.completionTitle}>Profile {completion}% Complete</Text>
                <Text style={styles.completionAction}>Complete →</Text>
              </View>
              <View style={styles.completionBarBg}>
                <View style={[styles.completionBarFill, { width: `${completion}%` }]} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Calendar size={18} color={theme.colors.brand} />
            <Text style={styles.statNumber}>{createdEventsCount}</Text>
            <Text style={styles.statLabel}>Events Posted</Text>
          </View>

          <View style={styles.statCard}>
            <Heart size={18} color="#EF4444" />
            <Text style={styles.statNumber}>{totalSavesCount}</Text>
            <Text style={styles.statLabel}>Total Saves</Text>
          </View>

          <View style={styles.statCard}>
            <Bookmark size={18} color="#F59E0B" />
            <Text style={styles.statNumber}>{savedCount}</Text>
            <Text style={styles.statLabel}>Bookmarks</Text>
          </View>
        </View>

        {/* Navigation Action Rows */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>My Activity</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('MyPostedEvents')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconBg, { backgroundColor: theme.colors.brandLight }]}>
                <Calendar size={18} color={theme.colors.brand} />
              </View>
              <Text style={styles.menuItemText}>My Posted Events</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('SavedEvents')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconBg, { backgroundColor: '#FEF3C7' }]}>
                <Bookmark size={18} color="#D97706" />
              </View>
              <Text style={styles.menuItemText}>Saved / Bookmarked Events</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Leaderboard')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconBg, { backgroundColor: '#EFF6FF' }]}>
                <Trophy size={18} color="#2563EB" />
              </View>
              <Text style={styles.menuItemText}>ET Score Leaderboard</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Administration Section (If Admin) */}
        {isAdmin && (
          <View style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>Administration</Text>

            <TouchableOpacity
              style={[styles.menuItem, styles.adminMenuItem]}
              onPress={() => navigation.navigate('Admin')}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconBg, { backgroundColor: '#DC2626' }]}>
                  <Shield size={18} color="#FFF" />
                </View>
                <View>
                  <Text style={styles.adminMenuItemText}>Admin Management Console</Text>
                  <Text style={styles.adminMenuSubtext}>Approvals, Reports, Users & Settings</Text>
                </View>
              </View>
              <ChevronRight size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Feedback & Support */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Support & Feedback</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setShowFeedbackModal(true)}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconBg, { backgroundColor: '#F5F3FF' }]}>
                <MessageSquare size={18} color="#6C47FF" />
              </View>
              <Text style={styles.menuItemText}>Share Feedback / Bug Report</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Settings & Preferences */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Account & Legal</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Settings')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconBg, { backgroundColor: theme.colors.surfaceSecondary }]}>
                <Settings size={18} color={theme.colors.textPrimary} />
              </View>
              <Text style={styles.menuItemText}>Edit Profile & Preferences</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconBg, { backgroundColor: '#ECFDF5' }]}>
                <CheckCircle size={18} color="#059669" />
              </View>
              <Text style={styles.menuItemText}>Privacy Policy (DPDP)</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Terms')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconBg, { backgroundColor: '#EDE9FE' }]}>
                <Shield size={18} color={theme.colors.brand} />
              </View>
              <Text style={styles.menuItemText}>Terms of Service</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleSignOut}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconBg, { backgroundColor: theme.colors.dangerBg }]}>
                <LogOut size={18} color={theme.colors.danger} />
              </View>
              <Text style={[styles.menuItemText, { color: theme.colors.danger }]}>Sign Out</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* In-App Feedback Modal */}
      <FeedbackModal
        visible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 40,
  },
  guestContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    gap: 12,
  },
  guestIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.colors.textPrimary,
  },
  guestSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  signInBtn: {
    marginTop: 12,
    backgroundColor: theme.colors.brand,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.brand,
  },
  signInBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  profileCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900',
  },
  profileDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fullName: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  username: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  tierPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  tierText: {
    fontSize: 11,
    fontWeight: '800',
  },
  scoreText: {
    fontSize: 11,
    fontWeight: '700',
  },
  academicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  academicText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  goalsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  goalChip: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  goalChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6C47FF',
  },
  moreGoalsText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  completionCard: {
    marginTop: 14,
    backgroundColor: theme.colors.surfaceSecondary,
    padding: 10,
    borderRadius: theme.borderRadius.md,
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  completionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  completionAction: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.brand,
  },
  completionBarBg: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  completionBarFill: {
    height: '100%',
    backgroundColor: theme.colors.brand,
    borderRadius: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
    ...theme.shadows.sm,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  menuSection: {
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  menuSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: theme.borderRadius.md,
  },
  adminMenuItem: {
    backgroundColor: '#FEF2F2',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  adminMenuItemText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991B1B',
  },
  adminMenuSubtext: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 2,
  },
});
