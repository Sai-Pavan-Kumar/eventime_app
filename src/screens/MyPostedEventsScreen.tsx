import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import {
  ArrowLeft,
  Calendar,
  Eye,
  Edit3,
  Trash2,
  Bookmark,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { APP_ASSETS } from '../lib/asset-registry';
import { EmptyState } from '../components/EmptyState';
import { FeedSkeleton } from '../components/EventCardSkeleton';
import { withTimeout } from '../lib/api-resilience';
import { parseEventDateString } from '../lib/utils/date';
import type { EventRow, RootStackParamList } from '../types';

export default function MyPostedEventsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();

  const [events, setEvents] = useState<(EventRow & { saved_count?: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMyEvents = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    try {
      const query = supabase
        .from('events')
        .select('*, saved_events(count), interested_events(count)')
        .eq('creator_id', user.id);

      const { data, error } = await withTimeout(query, 8000);

      if (error) throw error;

      const formatted = (data || []).map((ev: any) => ({
        ...ev,
        saved_count: ev.saved_events?.[0]?.count || 0,
      }));

      // Sort strictly in chronological order (soonest/earliest event date to latest)
      const sorted = formatted.sort((a: any, b: any) => {
        const timeA = parseEventDateString(a.date_string)?.getTime() || 0;
        const timeB = parseEventDateString(b.date_string)?.getTime() || 0;
        if (timeA === 0 && timeB === 0) return 0;
        if (timeA === 0) return 1;
        if (timeB === 0) return -1;
        return timeA - timeB;
      });

      setEvents(sorted);
    } catch (err) {
      console.error('Fetch my posted events error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMyEvents();
  }, [fetchMyEvents]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchMyEvents();
  };

  const handleDelete = (eventId: string, title: string) => {
    Alert.alert('Delete Event', `Are you sure you want to delete "${title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('events').delete().eq('id', eventId);
            if (error) throw error;
            setEvents((prev) => prev.filter((e) => e.id !== eventId));
          } catch (e: any) {
            Alert.alert('Delete Error', e?.message || 'Could not delete event.');
          }
        },
      },
    ]);
  };

  const getStatusBadge = (status: string | null) => {
    if (status === 'approved') {
      return (
        <View style={[styles.statusBadge, styles.statusApproved]}>
          <CheckCircle2 size={12} color="#059669" />
          <Text style={[styles.statusText, { color: '#059669' }]}>Approved & Live</Text>
        </View>
      );
    }
    if (status === 'rejected') {
      return (
        <View style={[styles.statusBadge, styles.statusRejected]}>
          <XCircle size={12} color="#DC2626" />
          <Text style={[styles.statusText, { color: '#DC2626' }]}>Rejected</Text>
        </View>
      );
    }
    return (
      <View style={[styles.statusBadge, styles.statusPending]}>
        <Clock size={12} color="#D97706" />
        <Text style={[styles.statusText, { color: '#D97706' }]}>Pending Review</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Posted Events</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('CreateEvent', {})}
        >
          <Plus size={20} color={theme.colors.brand} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <FeedSkeleton count={3} />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
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
          renderItem={({ item }) => (
            <View style={styles.eventRowCard}>
              <View style={styles.cardTopRow}>
                {item.poster_url ? (
                  <Image source={{ uri: item.poster_url }} style={styles.thumbImage} contentFit="cover" />
                ) : (
                  <View style={styles.fallbackThumb}>
                    <Calendar size={20} color={theme.colors.brand} />
                  </View>
                )}

                <View style={styles.cardInfo}>
                  {getStatusBadge(item.status)}
                  <Text style={styles.eventTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.eventDate}>{item.date_string}</Text>
                </View>
              </View>

              {/* Stats & Actions Bar */}
              <View style={styles.cardFooter}>
                <View style={styles.savesIndicator}>
                  <Bookmark size={13} color={theme.colors.textSecondary} />
                  <Text style={styles.savesText}>{item.saved_count || 0} Saves</Text>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.actionIconBtn}
                    onPress={() =>
                      navigation.navigate('EventDetail', { slug: item.slug || item.id, id: item.id })
                    }
                  >
                    <Eye size={16} color={theme.colors.textPrimary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionIconBtn}
                    onPress={() => navigation.navigate('CreateEvent', { editId: item.id })}
                  >
                    <Edit3 size={16} color={theme.colors.brand} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionIconBtn, styles.deleteBtn]}
                    onPress={() => handleDelete(item.id, item.title)}
                  >
                    <Trash2 size={16} color={theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              illustration={APP_ASSETS.illustrations.empty}
              title="You haven't posted any events yet"
              message="Host or know about an exciting workshop, hackathon, or meetup? Share it with the community!"
              buttonText="+ Post Your First Event"
              onButtonPress={() => navigation.navigate('CreateEvent', {})}
            />
          }
        />
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
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: theme.colors.textPrimary,
  },
  listContent: {
    padding: theme.spacing.xl,
    paddingBottom: 40,
  },
  eventRowCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
    ...theme.shadows.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    gap: 12,
  },
  thumbImage: {
    width: 76,
    height: 76,
    borderRadius: theme.borderRadius.md,
  },
  fallbackThumb: {
    width: 76,
    height: 76,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    marginBottom: 4,
    gap: 4,
  },
  statusApproved: {
    backgroundColor: '#ECFDF5',
  },
  statusPending: {
    backgroundColor: '#FFFBEB',
  },
  statusRejected: {
    backgroundColor: '#FEF2F2',
  },
  statusText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 10,
  },
  eventTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    color: theme.colors.textPrimary,
    lineHeight: 19,
    marginBottom: 4,
  },
  eventDate: {
    fontFamily: 'Switzer-Medium',
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  savesIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  savesText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    backgroundColor: theme.colors.dangerBg,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: theme.colors.textPrimary,
  },
  emptySubtitle: {
    fontFamily: 'Switzer-Regular',
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  postNowBtn: {
    marginTop: 10,
    backgroundColor: theme.colors.brand,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
  },
  postNowText: {
    fontFamily: 'Switzer-Bold',
    color: '#FFF',
    fontSize: 14,
  },
});
