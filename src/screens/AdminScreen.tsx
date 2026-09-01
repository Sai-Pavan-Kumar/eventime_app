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
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import type { EventRow, ReportRow, CollegeRow } from '../types';

export default function AdminScreen() {
  const navigation = useNavigation();
  const { user, profile, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'reports' | 'colleges'>('pending');

  // Pending & All Events state
  const [events, setEvents] = useState<EventRow[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [colleges, setColleges] = useState<CollegeRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Reject Modal
  const [rejectModalEventId, setRejectModalEventId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  // Add College Modal
  const [showAddCollege, setShowAddCollege] = useState(false);
  const [collegeName, setCollegeName] = useState('');
  const [collegeState, setCollegeState] = useState('');
  const [collegeWebsite, setCollegeWebsite] = useState('');

  const loadData = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoading(true);

    try {
      if (activeTab === 'pending') {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setEvents(data || []);
      } else if (activeTab === 'all') {
        let q = supabase.from('events').select('*').order('created_at', { ascending: false }).limit(50);
        if (searchQuery.trim()) {
          q = q.ilike('title', `%${searchQuery.trim()}%`);
        }
        const { data, error } = await q;
        if (error) throw error;
        setEvents(data || []);
      } else if (activeTab === 'reports') {
        const { data, error } = await supabase
          .from('event_reports')
          .select('*, events(id, title, slug, status)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setReports(data || []);
      } else if (activeTab === 'colleges') {
        const { data, error } = await supabase
          .from('colleges')
          .select('*')
          .order('name', { ascending: true });
        if (error) throw error;
        setColleges(data || []);
      }
    } catch (err) {
      console.error('[AdminScreen] Load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, isAdmin, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Guard
  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.center}>
        <Shield size={48} color={theme.colors.danger} />
        <Text style={styles.errorTitle}>Access Denied</Text>
        <Text style={styles.errorSubtitle}>
          You must be an administrator to access the EvenTime management panel.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleApprove = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', eventId);

      if (error) throw error;
      Alert.alert('Success', 'Event approved & published live!');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not approve event.');
    }
  };

  const handleReject = async () => {
    if (!rejectModalEventId) return;
    try {
      const { error } = await supabase
        .from('events')
        .update({
          status: 'rejected',
          admin_notes: adminNotes.trim() || null,
        })
        .eq('id', rejectModalEventId);

      if (error) throw error;
      setRejectModalEventId(null);
      setAdminNotes('');
      Alert.alert('Event Rejected', 'Event marked as rejected.');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not reject event.');
    }
  };

  const handleToggleFeatured = async (eventId: string, currentFeatured: boolean | null) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ is_featured: !currentFeatured })
        .eq('id', eventId);

      if (error) throw error;
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not update featured status.');
    }
  };

  const handleDeleteEvent = (eventId: string, title: string) => {
    Alert.alert('Delete Event', `Delete "${title}" permanently?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('events').delete().eq('id', eventId);
            if (error) throw error;
            loadData();
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Could not delete event.');
          }
        },
      },
    ]);
  };

  const handleResolveReport = async (reportId: string, status: 'resolved' | 'dismissed') => {
    try {
      const { error } = await supabase
        .from('event_reports')
        .update({ status })
        .eq('id', reportId);

      if (error) throw error;
      Alert.alert('Report Updated', `Report marked as ${status}.`);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not update report.');
    }
  };

  const handleAddCollege = async () => {
    if (!collegeName.trim()) {
      Alert.alert('Name Required', 'Please enter the college name.');
      return;
    }
    try {
      const { error } = await supabase.from('colleges').insert({
        name: collegeName.trim(),
        state: collegeState.trim() || null,
        website: collegeWebsite.trim() || null,
      });

      if (error) throw error;
      setShowAddCollege(false);
      setCollegeName('');
      setCollegeState('');
      setCollegeWebsite('');
      Alert.alert('Success', 'College added to directory.');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not add college.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Shield size={18} color="#DC2626" />
          <Text style={styles.headerTitle}>Admin Panel</Text>
        </View>
        {activeTab === 'colleges' ? (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddCollege(true)}>
            <Plus size={18} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {(['pending', 'all', 'reports', 'colleges'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
              {tab === 'pending'
                ? 'Pending'
                : tab === 'all'
                ? 'All Events'
                : tab === 'reports'
                ? 'Reports'
                : 'Colleges'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.brand} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Search bar for All Events */}
          {activeTab === 'all' && (
            <View style={styles.searchBar}>
              <Search size={16} color={theme.colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search event title..."
                placeholderTextColor={theme.colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={loadData}
              />
            </View>
          )}

          {/* Pending / All Events List */}
          {(activeTab === 'pending' || activeTab === 'all') && (
            <FlatList
              data={events}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={styles.adminCard}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.eventTitle}>{item.title}</Text>
                      <Text style={styles.eventSub}>
                        {item.category} • {item.city || 'Online'} • {item.date_string}
                      </Text>
                      <Text style={styles.organizerText}>By {item.organizer_name}</Text>
                    </View>

                    {item.poster_url && (
                      <Image source={{ uri: item.poster_url }} style={styles.eventThumb} />
                    )}
                  </View>

                  {/* Actions Row */}
                  <View style={styles.adminActions}>
                    <TouchableOpacity
                      style={[styles.actionPill, item.is_featured && styles.featuredPill]}
                      onPress={() => handleToggleFeatured(item.id, item.is_featured)}
                    >
                      <Text
                        style={[
                          styles.actionPillText,
                          item.is_featured && { color: '#D97706', fontWeight: '800' },
                        ]}
                      >
                        {item.is_featured ? 'Featured ★' : 'Feature'}
                      </Text>
                    </TouchableOpacity>

                    {item.status === 'pending' && (
                      <>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.approveBtn]}
                          onPress={() => handleApprove(item.id)}
                        >
                          <CheckCircle2 size={15} color="#FFF" />
                          <Text style={styles.actionBtnText}>Approve</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, styles.rejectBtn]}
                          onPress={() => setRejectModalEventId(item.id)}
                        >
                          <XCircle size={15} color="#FFF" />
                          <Text style={styles.actionBtnText}>Reject</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    <TouchableOpacity
                      style={styles.deleteIconBtn}
                      onPress={() => handleDeleteEvent(item.id, item.title)}
                    >
                      <Trash2 size={15} color={theme.colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <CheckCircle2 size={44} color={theme.colors.success} />
                  <Text style={styles.emptyTitle}>
                    {activeTab === 'pending' ? 'No Pending Approvals' : 'No Events Found'}
                  </Text>
                </View>
              }
            />
          )}

          {/* Reports List */}
          {activeTab === 'reports' && (
            <FlatList
              data={reports}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={styles.adminCard}>
                  <View style={styles.reportHeader}>
                    <AlertTriangle size={16} color="#DC2626" />
                    <Text style={styles.reportEventTitle}>{item.events?.title || 'Unknown Event'}</Text>
                  </View>

                  <Text style={styles.reportReason}>"{item.reason}"</Text>
                  <Text style={styles.reportStatus}>Status: {item.status || 'pending'}</Text>

                  <View style={styles.adminActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => handleResolveReport(item.id, 'resolved')}
                    >
                      <CheckCircle2 size={14} color="#FFF" />
                      <Text style={styles.actionBtnText}>Resolve</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.dismissBtn]}
                      onPress={() => handleResolveReport(item.id, 'dismissed')}
                    >
                      <Text style={styles.dismissBtnText}>Dismiss</Text>
                    </TouchableOpacity>

                    {item.events?.id && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.rejectBtn]}
                        onPress={() => handleDeleteEvent(item.events.id, item.events.title)}
                      >
                        <Trash2 size={14} color="#FFF" />
                        <Text style={styles.actionBtnText}>Take Down Event</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <CheckCircle2 size={44} color={theme.colors.success} />
                  <Text style={styles.emptyTitle}>No Pending Reports</Text>
                </View>
              }
            />
          )}

          {/* Colleges List */}
          {activeTab === 'colleges' && (
            <FlatList
              data={colleges}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={styles.collegeRow}>
                  <Building size={18} color={theme.colors.brand} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.collegeName}>{item.name}</Text>
                    {item.state && <Text style={styles.collegeState}>{item.state}</Text>}
                  </View>
                </View>
              )}
            />
          )}
        </View>
      )}

      {/* Reject Reason Modal */}
      <Modal visible={!!rejectModalEventId} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject Event</Text>
            <Text style={styles.modalSubtitle}>
              Provide feedback or administrative reason for the rejection:
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Broken registration link, missing poster, duplicate..."
              placeholderTextColor={theme.colors.textMuted}
              multiline
              numberOfLines={3}
              value={adminNotes}
              onChangeText={setAdminNotes}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRejectModalEventId(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalRejectBtn} onPress={handleReject}>
                <Text style={styles.modalRejectText}>Confirm Reject</Text>
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
              style={styles.singleInput}
              placeholder="College Name (e.g. BITS Pilani)"
              placeholderTextColor={theme.colors.textMuted}
              value={collegeName}
              onChangeText={setCollegeName}
            />

            <TextInput
              style={styles.singleInput}
              placeholder="State / Region (e.g. Rajasthan)"
              placeholderTextColor={theme.colors.textMuted}
              value={collegeState}
              onChangeText={setCollegeState}
            />

            <TextInput
              style={styles.singleInput}
              placeholder="Official Website (Optional)"
              placeholderTextColor={theme.colors.textMuted}
              value={collegeWebsite}
              onChangeText={setCollegeWebsite}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowAddCollege(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalApproveBtn} onPress={handleAddCollege}>
                <Text style={styles.modalApproveText}>Save College</Text>
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
    backgroundColor: theme.colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 10,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.danger,
  },
  errorSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 10,
    backgroundColor: theme.colors.brand,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
  },
  backButtonText: {
    color: '#FFF',
    fontWeight: '700',
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
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
  },
  tabBtnActive: {
    backgroundColor: '#1E1B4B',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  tabBtnTextActive: {
    color: '#FFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  adminCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 10,
    ...theme.shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 10,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    lineHeight: 18,
  },
  eventSub: {
    fontSize: 11,
    color: theme.colors.brand,
    fontWeight: '600',
    marginTop: 2,
  },
  organizerText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  eventThumb: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.md,
  },
  adminActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    gap: 8,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceSecondary,
    gap: 4,
  },
  featuredPill: {
    backgroundColor: '#FEF3C7',
  },
  actionPillText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  approveBtn: {
    backgroundColor: theme.colors.success,
  },
  rejectBtn: {
    backgroundColor: theme.colors.danger,
  },
  dismissBtn: {
    backgroundColor: theme.colors.surfaceSecondary,
  },
  dismissBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  deleteIconBtn: {
    marginLeft: 'auto',
    padding: 6,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  reportEventTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  reportReason: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  reportStatus: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  collegeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
  },
  collegeName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  collegeState: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    fontSize: 13,
    color: theme.colors.textPrimary,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  singleInput: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  modalRejectBtn: {
    backgroundColor: theme.colors.danger,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
  },
  modalRejectText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalApproveBtn: {
    backgroundColor: theme.colors.brand,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
  },
  modalApproveText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
