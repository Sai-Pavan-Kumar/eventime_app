import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import {
  ArrowLeft,
  Shield,
  CheckCircle2,
  XCircle,
  Trash2,
  AlertTriangle,
  Building,
  Plus,
  Search,
  ExternalLink,
  MessageSquare,
  Users,
  Trophy,
  Star,
  RefreshCw,
  Eye,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { sendRemotePushNotification } from '../lib/notifications';
import type { EventRow, ReportRow, CollegeRow, FeedbackRow, ProfileRow } from '../types';

export default function AdminScreen() {
  const navigation = useNavigation<any>();
  const { user, profile, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'pending' | 'events' | 'feedback' | 'users' | 'reports' | 'colleges'>('overview');

  // KPI Stats
  const [stats, setStats] = useState({
    pendingEvents: 0,
    activeEvents: 0,
    totalUsers: 0,
    openReports: 0,
    feedbackCount: 0,
  });

  // Settings
  const [leaderboardEnabled, setLeaderboardEnabled] = useState(true);
  const [featuredEnabled, setFeaturedEnabled] = useState(true);

  // Data lists
  const [events, setEvents] = useState<EventRow[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([]);
  const [usersList, setUsersList] = useState<ProfileRow[]>([]);
  const [colleges, setColleges] = useState<CollegeRow[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [eventStatusFilter, setEventStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected' | 'featured'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Reject Modal
  const [rejectModalEventId, setRejectModalEventId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  // Add College Modal
  const [showAddCollege, setShowAddCollege] = useState(false);
  const [collegeName, setCollegeName] = useState('');
  const [collegeState, setCollegeState] = useState('');
  const [collegeWebsite, setCollegeWebsite] = useState('');

  // Load KPI Stats & App Settings
  const loadOverviewStats = useCallback(async () => {
    try {
      const [
        { count: pendingCount },
        { count: activeCount },
        { count: userCount },
        { count: reportCount },
        { count: feedbackCount },
        { data: settings },
      ] = await Promise.all([
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('event_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('platform_feedback').select('id', { count: 'exact', head: true }),
        supabase.from('app_settings').select('leaderboard_enabled, featured_enabled').eq('id', 1).maybeSingle(),
      ]);

      setStats({
        pendingEvents: pendingCount || 0,
        activeEvents: activeCount || 0,
        totalUsers: userCount || 0,
        openReports: reportCount || 0,
        feedbackCount: feedbackCount || 0,
      });

      if (settings) {
        if (settings.leaderboard_enabled !== undefined) {
          setLeaderboardEnabled(settings.leaderboard_enabled);
        }
        if (settings.featured_enabled !== undefined) {
          setFeaturedEnabled(settings.featured_enabled);
        }
      }
    } catch (e) {
      console.error('[AdminScreen] Stats load error:', e);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoading(true);

    try {
      if (activeTab === 'overview') {
        await loadOverviewStats();
      } else if (activeTab === 'pending') {
        const { data, error } = await supabase
          .from('events')
          .select('*, profiles(full_name, username)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setEvents(data || []);
      } else if (activeTab === 'events') {
        let q = supabase.from('events').select('*, profiles(full_name, username)').order('created_at', { ascending: false }).limit(50);
        if (eventStatusFilter === 'featured') {
          q = q.eq('is_featured', true);
        } else if (eventStatusFilter !== 'all') {
          q = q.eq('status', eventStatusFilter);
        }
        if (searchQuery.trim()) {
          q = q.ilike('title', `%${searchQuery.trim()}%`);
        }
        const { data, error } = await q;
        if (error) throw error;
        setEvents(data || []);
      } else if (activeTab === 'feedback') {
        const { data, error } = await supabase
          .from('platform_feedback')
          .select('*, profiles(full_name, email)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setFeedbacks(data || []);
      } else if (activeTab === 'users') {
        let q = supabase.from('profiles').select('*').order('updated_at', { ascending: false }).limit(50);
        if (searchQuery.trim()) {
          q = q.or(`full_name.ilike.%${searchQuery.trim()}%,email.ilike.%${searchQuery.trim()}%,username.ilike.%${searchQuery.trim()}%`);
        }
        const { data, error } = await q;
        if (error) throw error;
        setUsersList(data || []);
      } else if (activeTab === 'reports') {
        const { data, error } = await supabase
          .from('event_reports')
          .select('*, events(id, title, slug, status), reporter:profiles!event_reports_reporter_id_fkey(full_name, email)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setReports(data || []);
      } else if (activeTab === 'colleges') {
        let q = supabase.from('colleges').select('*').order('name', { ascending: true });
        if (searchQuery.trim()) {
          q = q.ilike('name', `%${searchQuery.trim()}%`);
        }
        const { data, error } = await q;
        if (error) throw error;
        setColleges(data || []);
      }
    } catch (err) {
      console.error('[AdminScreen] Load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, isAdmin, searchQuery, eventStatusFilter, loadOverviewStats]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Actions
  const handleApproveEvent = async (eventItem: EventRow) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', eventItem.id);

      if (error) throw error;

      // Award +100 ET points to creator (using idempotent award_event_approval_score RPC)
      if (eventItem.creator_id) {
        try {
          const { error: rpcError } = await supabase.rpc('award_event_approval_score', {
            p_user_id: eventItem.creator_id,
            p_event_id: eventItem.id,
          } as any);

          if (rpcError) {
            // Fallback for environments with standard increment_et_score RPC
            await supabase.rpc('increment_et_score', {
              user_id: eventItem.creator_id,
              delta: 100,
            } as any);
          }
        } catch (scoreErr) {
          console.warn('Could not award approval score:', scoreErr);
        }
      }

      // Send remote push notification to creator
      if (eventItem.creator_id) {
        sendRemotePushNotification({
          userIds: [eventItem.creator_id],
          title: 'Event Published',
          body: `"${eventItem.title}" is now live on EvenTime (+100 ET score).`,
          data: { eventId: eventItem.id, id: eventItem.id },
          channelId: 'events-reminders',
        });
      }

      // Broadcast notification to college or city audience
      const collegeTarget = eventItem.college_name || (eventItem as any).colleges?.name;
      if (collegeTarget) {
        sendRemotePushNotification({
          college: collegeTarget,
          notificationType: 'campus_alerts',
          title: `Campus Event · ${collegeTarget}`,
          body: `"${eventItem.title}" has been scheduled for your campus.`,
          data: { eventId: eventItem.id, id: eventItem.id },
          channelId: 'campus-alerts',
        });
      } else if (eventItem.city && eventItem.city !== 'Online') {
        sendRemotePushNotification({
          city: eventItem.city,
          category: eventItem.category,
          notificationType: 'city_updates',
          title: `New in ${eventItem.city} · ${eventItem.category || 'Event'}`,
          body: `"${eventItem.title}" opened for registration.`,
          data: { eventId: eventItem.id, id: eventItem.id },
          channelId: 'city-updates',
        });
      }

      Alert.alert('Approved', `"${eventItem.title}" is now published and live.`);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to approve event.');
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalEventId) return;
    try {
      const rejectedEvent = events.find((e) => e.id === rejectModalEventId);
      const noteText = adminNotes.trim() || 'Rejected by moderator.';

      const { error } = await supabase
        .from('events')
        .update({
          status: 'rejected',
          admin_notes: noteText,
        })
        .eq('id', rejectModalEventId);

      if (error) throw error;

      // Notify creator about rejection with clean, polite copy
      if (rejectedEvent?.creator_id) {
        sendRemotePushNotification({
          userIds: [rejectedEvent.creator_id],
          title: 'Event Submission Update',
          body: `Your submission for "${rejectedEvent.title}" was reviewed and could not be published at this time.`,
          data: { eventId: rejectedEvent.id, id: rejectedEvent.id },
          channelId: 'default',
        });
      }

      Alert.alert('Rejected', 'Event has been marked as rejected.');
      setRejectModalEventId(null);
      setAdminNotes('');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to reject event.');
    }
  };

  const handleToggleFeatured = async (eventId: string, currentVal: boolean | null) => {
    try {
      const newVal = !currentVal;
      const { error } = await supabase
        .from('events')
        .update({ is_featured: newVal })
        .eq('id', eventId);

      if (error) throw error;
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not toggle featured.');
    }
  };

  const handleDeleteEvent = async (eventId: string, title: string) => {
    Alert.alert('Delete Event', `Are you sure you want to permanently delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('events')
              .update({ status: 'deleted' })
              .eq('id', eventId);
            if (error) throw error;
            Alert.alert('Deleted', 'Event has been removed.');
            loadData();
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to delete.');
          }
        },
      },
    ]);
  };

  const handleToggleLeaderboardSetting = async (val: boolean) => {
    try {
      setLeaderboardEnabled(val);
      await supabase.from('app_settings').update({ leaderboard_enabled: val }).eq('id', 1);
    } catch (e) {
      console.error('Toggle leaderboard error:', e);
    }
  };

  const handleToggleFeaturedSetting = async (val: boolean) => {
    try {
      setFeaturedEnabled(val);
      await supabase.from('app_settings').update({ featured_enabled: val }).eq('id', 1);
    } catch (e) {
      console.error('Toggle featured error:', e);
    }
  };

  const handleToggleUserRole = async (targetUser: ProfileRow) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    Alert.alert(
      'Change Role',
      `Change ${targetUser.full_name || 'user'}'s role to ${newRole.toUpperCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', targetUser.id);
              if (error) throw error;
              Alert.alert('Success', `Role updated to ${newRole}.`);
              loadData();
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Could not update role.');
            }
          },
        },
      ]
    );
  };

  const handleDismissReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('event_reports')
        .update({ status: 'dismissed' })
        .eq('id', reportId);
      if (error) throw error;
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not dismiss report.');
    }
  };

  const handleTakeDownReportedEvent = async (reportId: string, eventId: string) => {
    Alert.alert('Take Down Event', 'Remove this event from directory and resolve report?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Take Down',
        style: 'destructive',
        onPress: async () => {
          try {
            const { data: report } = await supabase
              .from("event_reports")
              .select("curator_id, event_id")
              .eq("id", reportId)
              .single();

            if (!report?.curator_id || !report?.event_id) {
              Alert.alert('Error', 'Report not found.');
              return;
            }

            const { count: alreadyResolvedCount } = await supabase
              .from("event_reports")
              .select("id", { count: "exact", head: true })
              .eq("event_id", report.event_id)
              .eq("status", "resolved");

            await supabase.from('events').update({ status: 'rejected', admin_notes: 'Taken down due to user reports' }).eq('id', eventId);
            await supabase.from('event_reports').update({ status: 'resolved' }).eq('id', reportId);

            if ((alreadyResolvedCount ?? 0) > 0) {
              Alert.alert('Resolved', 'Event taken down. Penalty already applied earlier.');
              loadData();
              return;
            }

            const { data: allReports } = await supabase
              .from("event_reports")
              .select("reporter_id, reporter:profiles!event_reports_reporter_id_fkey(et_score)")
              .eq("event_id", report.event_id);

            const trustedReporterIds = new Set(
              (allReports || [])
                .filter((r: any) => (r.reporter?.et_score ?? 0) >= 150 && r.reporter_id)
                .map((r: any) => r.reporter_id)
            );

            if (trustedReporterIds.size < 5) {
              Alert.alert('Resolved', `Event taken down, but penalty needs 5+ trusted reporters (currently ${trustedReporterIds.size}).`);
            } else {
              await supabase.rpc('apply_leaderboard_penalty', {
                p_user_id: report.curator_id,
                p_amount: 25
              });
              Alert.alert('Resolved', 'Event taken down and -25 penalty applied to curator.');
            }
            
            loadData();
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to take down.');
          }
        },
      },
    ]);
  };

  const handleUpdateFeedbackStatus = async (feedbackId: string, newStatus: 'pending' | 'reviewed' | 'resolved') => {
    try {
      const { error } = await supabase
        .from('platform_feedback')
        .update({ status: newStatus })
        .eq('id', feedbackId);

      if (error) throw error;
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not update feedback status.');
    }
  };

  const handleAddCollege = async () => {
    if (!collegeName.trim()) {
      Alert.alert('Name Required', 'Please enter the college name.');
      return;
    }

    try {
      const slug = collegeName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const { error } = await supabase.from('colleges').insert({
        name: collegeName.trim(),
        slug,
        state: collegeState.trim() || null,
        website: collegeWebsite.trim() || null,
      });

      if (error) throw error;

      Alert.alert('Success', `College "${collegeName}" added successfully.`);
      setShowAddCollege(false);
      setCollegeName('');
      setCollegeState('');
      setCollegeWebsite('');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to add college.');
    }
  };

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.center}>
        <Shield size={48} color={theme.colors.danger} />
        <Text style={styles.unauthorizedTitle}>Admin Access Only</Text>
        <Text style={styles.unauthorizedSubtitle}>
          You do not have permissions to view the moderation console.
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Shield size={18} color={theme.colors.brand} />
          <Text style={styles.headerTitle}>ET98 Admin Console</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={loadData}>
          <RefreshCw size={18} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Tabs Horizontal Scroll */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'pending', label: `Pending (${stats.pendingEvents})` },
            { id: 'events', label: 'All Events' },
            { id: 'feedback', label: `Feedback (${stats.feedbackCount})` },
            { id: 'users', label: `Users (${stats.totalUsers})` },
            { id: 'reports', label: `Reports (${stats.openReports})` },
            { id: 'colleges', label: 'Colleges' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => {
                  setActiveTab(tab.id as any);
                  setSearchQuery('');
                }}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content Area */}
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.colors.brand} />
          </View>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.overviewContainer}>
                <Text style={styles.sectionHeader}>Directory Health & KPIs</Text>

                <View style={styles.kpiGrid}>
                  <TouchableOpacity
                    style={[styles.kpiCard, { borderColor: '#F59E0B' }]}
                    onPress={() => setActiveTab('pending')}
                  >
                    <AlertTriangle size={20} color="#D97706" />
                    <Text style={styles.kpiValue}>{stats.pendingEvents}</Text>
                    <Text style={styles.kpiLabel}>Pending Approvals</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.kpiCard, { borderColor: '#10B981' }]}
                    onPress={() => setActiveTab('events')}
                  >
                    <CheckCircle2 size={20} color="#059669" />
                    <Text style={styles.kpiValue}>{stats.activeEvents}</Text>
                    <Text style={styles.kpiLabel}>Active Events</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.kpiCard, { borderColor: '#6C47FF' }]}
                    onPress={() => setActiveTab('users')}
                  >
                    <Users size={20} color="#6C47FF" />
                    <Text style={styles.kpiValue}>{stats.totalUsers}</Text>
                    <Text style={styles.kpiLabel}>Registered Users</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.kpiCard, { borderColor: '#EF4444' }]}
                    onPress={() => setActiveTab('reports')}
                  >
                    <AlertTriangle size={20} color="#DC2626" />
                    <Text style={styles.kpiValue}>{stats.openReports}</Text>
                    <Text style={styles.kpiLabel}>Open Reports</Text>
                  </TouchableOpacity>
                </View>

                {/* Feature Controls */}
                <Text style={[styles.sectionHeader, { marginTop: 24 }]}>Feature Switches</Text>
                <View style={styles.controlCard}>
                  <View style={styles.controlRow}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={styles.controlTitle}>Curator Leaderboard</Text>
                      <Text style={styles.controlSubtitle}>
                        Enable or disable public leaderboard ranking and points tally.
                      </Text>
                    </View>
                    <Switch
                      value={leaderboardEnabled}
                      onValueChange={handleToggleLeaderboardSetting}
                      trackColor={{ false: theme.colors.border, true: theme.colors.brand }}
                    />
                  </View>

                  <View style={[styles.controlRow, { marginTop: 16 }]}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={styles.controlTitle}>Featured Events Carousel</Text>
                      <Text style={styles.controlSubtitle}>
                        Show or hide the featured events carousel on the home screen.
                      </Text>
                    </View>
                    <Switch
                      value={featuredEnabled}
                      onValueChange={handleToggleFeaturedSetting}
                      trackColor={{ false: theme.colors.border, true: theme.colors.brand }}
                    />
                  </View>
                </View>
              </ScrollView>
            )}

            {/* PENDING EVENTS TAB */}
            {activeTab === 'pending' && (
              <FlatList
                data={events}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <CheckCircle2 size={40} color={theme.colors.success} />
                    <Text style={styles.emptyTitle}>Queue All Clear!</Text>
                    <Text style={styles.emptySubtitle}>No pending events waiting for approval.</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={styles.eventCard}>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('EventDetail', { id: item.id, slug: item.slug })}
                      activeOpacity={0.8}
                    >
                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.eventTitle}>{item.title}</Text>
                          <Text style={styles.eventMeta}>
                            {item.date_string} • {item.city || 'Online'} • {item.category}
                          </Text>
                          <Text style={styles.organizerText}>
                            Submitted by:{' '}
                            <Text style={{ fontWeight: '700' }}>
                              {(item as any).profiles?.full_name || item.organizer_name || 'Curator'}
                            </Text>
                          </Text>
                        </View>
                        <Eye size={18} color="#6C47FF" style={{ marginLeft: 8 }} />
                      </View>
                    </TouchableOpacity>

                    {item.registration_link && (
                      <Text style={styles.linkText} numberOfLines={1}>
                        {item.registration_link}
                      </Text>
                    )}

                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.rejectBtn}
                        onPress={() => setRejectModalEventId(item.id)}
                      >
                        <XCircle size={16} color="#EF4444" />
                        <Text style={styles.rejectBtnText}>Reject</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.approveBtn}
                        onPress={() => handleApproveEvent(item)}
                      >
                        <CheckCircle2 size={16} color="#FFF" />
                        <Text style={styles.approveBtnText}>Approve (+100 ET)</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )}

            {/* ALL EVENTS TAB */}
            {activeTab === 'events' && (
              <View style={{ flex: 1 }}>
                <View style={styles.searchBarWrapper}>
                  <Search size={18} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search events by title..."
                    placeholderTextColor={theme.colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>

                {/* Status Filter Chips */}
                <View style={styles.statusFiltersRow}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusFiltersScroll}>
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'approved', label: 'Approved' },
                      { id: 'pending', label: 'Pending' },
                      { id: 'rejected', label: 'Rejected' },
                      { id: 'featured', label: 'Featured ⭐' },
                    ].map((f) => {
                      const isSelected = eventStatusFilter === f.id;
                      return (
                        <TouchableOpacity
                          key={f.id}
                          style={[styles.statusFilterChip, isSelected && styles.statusFilterChipActive]}
                          onPress={() => setEventStatusFilter(f.id as any)}
                        >
                          <Text style={[styles.statusFilterChipText, isSelected && styles.statusFilterChipTextActive]}>
                            {f.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <FlatList
                  data={events}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.listContent}
                  renderItem={({ item }) => (
                    <View style={styles.eventCard}>
                      <TouchableOpacity
                        onPress={() => navigation.navigate('EventDetail', { id: item.id, slug: item.slug })}
                        activeOpacity={0.8}
                      >
                        <View style={styles.cardHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.eventTitle}>{item.title}</Text>
                            <Text style={styles.eventMeta}>
                              {item.date_string} • {item.city || 'Online'} • Status:{' '}
                              <Text style={{ fontWeight: '800', color: item.status === 'approved' ? '#059669' : '#DC2626' }}>
                                {item.status?.toUpperCase()}
                              </Text>
                            </Text>
                          </View>
                          <Eye size={18} color="#6C47FF" style={{ marginLeft: 8 }} />
                        </View>
                      </TouchableOpacity>

                      <View style={styles.eventFooterActions}>
                        {/* Feature Toggle */}
                        <TouchableOpacity
                          style={[styles.featureToggleBtn, item.is_featured && styles.featureToggleBtnActive]}
                          onPress={() => handleToggleFeatured(item.id, item.is_featured)}
                        >
                          <Star size={14} color={item.is_featured ? '#D97706' : '#64748B'} fill={item.is_featured ? '#D97706' : 'none'} />
                          <Text style={[styles.featureToggleText, item.is_featured && { color: '#D97706' }]}>
                            {item.is_featured ? 'Featured' : 'Feature'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.deleteIconBtn}
                          onPress={() => handleDeleteEvent(item.id, item.title)}
                        >
                          <Trash2 size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                />
              </View>
            )}

            {/* FEEDBACK TAB */}
            {activeTab === 'feedback' && (
              <FlatList
                data={feedbacks}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <MessageSquare size={40} color={theme.colors.textMuted} />
                    <Text style={styles.emptyTitle}>No Feedback Yet</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={styles.feedbackCard}>
                    <View style={styles.feedbackHeader}>
                      <View style={[styles.typeBadge, item.type === 'bug' && { backgroundColor: '#FEE2E2' }]}>
                        <Text style={[styles.typeBadgeText, item.type === 'bug' && { color: '#DC2626' }]}>
                          {item.type?.toUpperCase() || 'GENERAL'}
                        </Text>
                      </View>
                      
                      <View style={styles.feedbackStatusBadge}>
                        <Text style={styles.feedbackStatusText}>{item.status?.toUpperCase() || 'PENDING'}</Text>
                      </View>
                    </View>

                    <Text style={styles.feedbackMessage}>{item.message}</Text>
                    
                    {(item as any).profiles?.email && (
                      <Text style={styles.feedbackUser}>
                        From: {(item as any).profiles?.full_name} ({(item as any).profiles?.email})
                      </Text>
                    )}

                    {/* Status Toggle Actions */}
                    <View style={styles.feedbackActionRow}>
                      {item.status !== 'reviewed' && item.status !== 'resolved' && (
                        <TouchableOpacity
                          style={styles.feedbackReviewBtn}
                          onPress={() => handleUpdateFeedbackStatus(item.id, 'reviewed')}
                        >
                          <Text style={styles.feedbackReviewText}>Mark Reviewed</Text>
                        </TouchableOpacity>
                      )}
                      {item.status !== 'resolved' && (
                        <TouchableOpacity
                          style={styles.feedbackResolveBtn}
                          onPress={() => handleUpdateFeedbackStatus(item.id, 'resolved')}
                        >
                          <Text style={styles.feedbackResolveText}>Mark Resolved</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              />
            )}

            {/* USERS MANAGEMENT TAB */}
            {activeTab === 'users' && (
              <View style={{ flex: 1 }}>
                <View style={styles.searchBarWrapper}>
                  <Search size={18} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search users by name, email, or username..."
                    placeholderTextColor={theme.colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>

                <FlatList
                  data={usersList}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.listContent}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Users size={40} color={theme.colors.textMuted} />
                      <Text style={styles.emptyTitle}>No Curators Found</Text>
                      <Text style={styles.emptySubtitle}>Try adjusting your search query.</Text>
                    </View>
                  }
                  renderItem={({ item }) => (
                    <View style={styles.userCard}>
                      <View style={styles.userRow}>
                        <View style={styles.userAvatar}>
                          <Text style={styles.userAvatarText}>
                            {(item.full_name || 'U').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.userName}>{item.full_name || 'User'}</Text>
                          <Text style={styles.userEmail}>{item.email || `@${item.username}`}</Text>
                          <Text style={styles.userStats}>
                            ET Score: <Text style={{ fontWeight: '800' }}>{item.et_score || 0}</Text> • Role:{' '}
                            <Text style={{ fontWeight: '800', color: item.role === 'admin' ? '#6C47FF' : '#475569' }}>
                              {item.role?.toUpperCase() || 'USER'}
                            </Text>
                          </Text>
                        </View>
                      </View>

                      {item.id !== user?.id && (
                        <View style={styles.userActions}>
                          <TouchableOpacity
                            style={styles.roleToggleBtn}
                            onPress={() => handleToggleUserRole(item)}
                          >
                            <Text style={styles.roleToggleText}>
                              {item.role === 'admin' ? 'Demote to User' : 'Make Admin'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                />
              </View>
            )}

            {/* REPORTS TAB */}
            {activeTab === 'reports' && (
              <FlatList
                data={reports}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <CheckCircle2 size={40} color={theme.colors.success} />
                    <Text style={styles.emptyTitle}>Zero Open Reports</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={styles.reportCard}>
                    <TouchableOpacity
                      onPress={() => item.event_id && navigation.navigate('EventDetail', { id: item.event_id })}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.reportEventTitle}>{item.events?.title || 'Unknown Event'} →</Text>
                    </TouchableOpacity>
                    <Text style={styles.reportReason}>Reason: "{item.reason}"</Text>
                    <Text style={styles.reporterInfo}>
                      Reported by: {item.reporter?.full_name || 'User'} ({item.reporter?.email || 'N/A'})
                    </Text>

                    {item.status === 'pending' && (
                      <View style={styles.reportActionRow}>
                        <TouchableOpacity
                          style={styles.dismissReportBtn}
                          onPress={() => handleDismissReport(item.id)}
                        >
                          <Text style={styles.dismissReportText}>Dismiss</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.takeDownBtn}
                          onPress={() => handleTakeDownReportedEvent(item.id, item.event_id)}
                        >
                          <Text style={styles.takeDownText}>Take Down Event</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              />
            )}

            {/* COLLEGES TAB */}
            {activeTab === 'colleges' && (
              <View style={{ flex: 1 }}>
                <View style={styles.collegeTopBar}>
                  <View style={[styles.searchBarWrapper, { flex: 1, marginRight: 8 }]}>
                    <Search size={18} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search colleges..."
                      placeholderTextColor={theme.colors.textMuted}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.addCollegeBtn}
                    onPress={() => setShowAddCollege(true)}
                  >
                    <Plus size={18} color="#FFF" />
                    <Text style={styles.addCollegeText}>Add</Text>
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={colleges}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.listContent}
                  renderItem={({ item }) => (
                    <View style={styles.collegeRow}>
                      <Building size={20} color={theme.colors.brand} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.collegeName}>{item.name}</Text>
                        <Text style={styles.collegeState}>{item.state || 'India'}</Text>
                      </View>
                    </View>
                  )}
                />
              </View>
            )}
          </>
        )}
      </View>

      {/* Reject Modal */}
      <Modal visible={!!rejectModalEventId} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject Event</Text>
            <Text style={styles.modalSubtitle}>Provide notes explaining why this was rejected:</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="e.g. Broken link, spam, incomplete details..."
              placeholderTextColor={theme.colors.textMuted}
              multiline
              numberOfLines={3}
              value={adminNotes}
              onChangeText={setAdminNotes}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setRejectModalEventId(null);
                  setAdminNotes('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleConfirmReject}>
                <Text style={styles.modalConfirmText}>Confirm Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add College Modal */}
      <Modal visible={showAddCollege} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add College</Text>
            <TextInput
              style={styles.inputField}
              placeholder="College Name (e.g. BITS Pilani)"
              placeholderTextColor={theme.colors.textMuted}
              value={collegeName}
              onChangeText={setCollegeName}
            />
            <TextInput
              style={styles.inputField}
              placeholder="State (e.g. Telangana / Rajasthan)"
              placeholderTextColor={theme.colors.textMuted}
              value={collegeState}
              onChangeText={setCollegeState}
            />
            <TextInput
              style={styles.inputField}
              placeholder="Website URL (Optional)"
              placeholderTextColor={theme.colors.textMuted}
              value={collegeWebsite}
              onChangeText={setCollegeWebsite}
              autoCapitalize="none"
              keyboardType="url"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowAddCollege(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleAddCollege}>
                <Text style={styles.modalConfirmText}>Save College</Text>
              </TouchableOpacity>
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
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: '#0F172A',
  },
  tabsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabsScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  tabBtnActive: {
    backgroundColor: theme.colors.brand,
  },
  tabText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 13,
    color: '#64748B',
  },
  tabTextActive: {
    fontFamily: 'Switzer-Bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  overviewContainer: {
    padding: 16,
  },
  sectionHeader: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 12,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
  },
  kpiValue: {
    fontFamily: 'Outfit-Bold',
    fontSize: 24,
    color: '#0F172A',
  },
  kpiLabel: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: '#64748B',
  },
  controlCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  controlSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    padding: 0,
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  eventMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  organizerText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
  },
  linkText: {
    fontSize: 12,
    color: theme.colors.brand,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingVertical: 10,
    borderRadius: 10,
  },
  rejectBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  approveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.brand,
    paddingVertical: 10,
    borderRadius: 10,
  },
  approveBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  eventFooterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  featureToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  featureToggleBtnActive: {
    backgroundColor: '#FEF3C7',
  },
  featureToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  deleteIconBtn: {
    padding: 6,
  },
  feedbackCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.brand,
  },
  feedbackDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  feedbackMessage: {
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 20,
  },
  feedbackUser: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.brand,
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  userEmail: {
    fontSize: 12,
    color: '#64748B',
  },
  userStats: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  roleToggleBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  reportEventTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  reportReason: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
  },
  reporterInfo: {
    fontSize: 12,
    color: '#64748B',
  },
  reportActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  dismissReportBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  dismissReportText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  takeDownBtn: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  takeDownText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  collegeTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  addCollegeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.brand,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 12,
  },
  addCollegeText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  collegeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  collegeName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  collegeState: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  unauthorizedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
  },
  unauthorizedSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  backBtn: {
    backgroundColor: theme.colors.brand,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
  },
  notesInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  inputField: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalCancelText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 14,
    color: '#64748B',
  },
  modalConfirmBtn: {
    backgroundColor: theme.colors.brand,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalConfirmText: {
    fontFamily: 'Switzer-Bold',
    color: '#FFF',
    fontSize: 14,
  },
  statusFiltersRow: {
    marginBottom: 12,
  },
  statusFiltersScroll: {
    gap: 8,
    paddingHorizontal: 2,
  },
  statusFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusFilterChipActive: {
    backgroundColor: '#6C47FF',
    borderColor: '#6C47FF',
  },
  statusFilterChipText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: '#64748B',
  },
  statusFilterChipTextActive: {
    color: '#FFFFFF',
  },
  feedbackStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  feedbackStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
  },
  feedbackActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  feedbackReviewBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  feedbackReviewText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  feedbackResolveBtn: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  feedbackResolveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
});
