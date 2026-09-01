import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Video,
  Bookmark,
  Share2,
  ExternalLink,
  Flag,
  Users,
  Award,
  Sparkles,
  CheckCircle2,
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { getCategoryMeta } from '../lib/category-config';
import { getCategoryPoster } from '../lib/asset-registry';
import { useAuth } from '../context/AuthContext';
import type { EventRow, RootStackParamList } from '../types';

export default function EventDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'EventDetail'>>();
  const navigation = useNavigation();
  const { user } = useAuth();

  const { slug, id, eventId } = (route.params || {}) as any;

  const [event, setEvent] = useState<EventRow | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Report Modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const fetchEvent = useCallback(async () => {
    try {
      let query = supabase.from('events').select('*');

      const targetId = eventId || id;
      if (targetId) {
        query = query.eq('id', targetId);
      } else if (slug) {
        query = query.eq('slug', slug);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      setEvent(data);

      if (data && user) {
        const { data: savedRow } = await supabase
          .from('saved_events')
          .select('id')
          .eq('event_id', data.id)
          .eq('user_id', user.id)
          .maybeSingle();
        setIsSaved(!!savedRow);
      }
    } catch (err) {
      console.error('[EventDetail] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id, slug, user]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const handleShare = async () => {
    if (!event) return;
    try {
      await Share.share({
        title: event.title,
        message: `Check out "${event.title}" on EvenTime!\nDate: ${event.date_string}\nRegister: ${event.registration_link || event.website || ''}`,
      });
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  const handleBookmarkToggle = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to save this event.');
      return;
    }
    if (!event) return;

    const nextState = !isSaved;
    setIsSaved(nextState);
    setIsSaving(true);

    try {
      if (nextState) {
        await supabase.from('saved_events').insert({
          event_id: event.id,
          user_id: user.id,
        });
      } else {
        await supabase
          .from('saved_events')
          .delete()
          .eq('event_id', event.id)
          .eq('user_id', user.id);
      }
    } catch (e) {
      console.error('Bookmark error:', e);
      setIsSaved(!nextState);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegister = async () => {
    const link = event?.registration_link || event?.website || event?.external_link;
    if (!link) {
      Alert.alert('No Link Provided', 'Organizer did not specify a registration link.');
      return;
    }
    const formattedUrl = link.startsWith('http') ? link : `https://${link}`;
    await WebBrowser.openBrowserAsync(formattedUrl);
  };

  const handleSendReport = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to report an issue.');
      return;
    }
    if (!reportReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for reporting this event.');
      return;
    }
    if (!event) return;

    setIsSubmittingReport(true);
    try {
      const { error } = await supabase.from('event_reports').insert({
        event_id: event.id,
        reporter_id: user.id,
        curator_id: event.creator_id,
        reason: reportReason.trim(),
        status: 'pending',
      });
      if (error) throw error;
      Alert.alert('Report Submitted', 'Thank you. Our moderation team will review this event.');
      setShowReportModal(false);
      setReportReason('');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not submit report.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.brand} />
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>Event not found.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const categoryMeta = getCategoryMeta(event.category);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header Bar */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.topNavActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
            <Share2 size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, isSaved && styles.iconBtnSaved]}
            onPress={handleBookmarkToggle}
            disabled={isSaving}
          >
            <Bookmark
              size={20}
              color={isSaved ? '#FFF' : theme.colors.textPrimary}
              fill={isSaved ? '#FFF' : 'transparent'}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Poster Media */}
        <View style={styles.posterContainer}>
          <Image
            source={event.poster_url && event.poster_url.startsWith('http') ? { uri: event.poster_url } : getCategoryPoster(event.category)}
            style={styles.posterImage}
            contentFit="cover"
            transition={300}
          />

          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: 'rgba(15, 23, 42, 0.75)' },
            ]}
          >
            <Text style={[styles.categoryBadgeText, { color: '#FFFFFF' }]}>
              {event.category || 'Event'}
            </Text>
          </View>
        </View>

        {/* Event Main Info */}
        <View style={styles.mainInfo}>
          <Text style={styles.title}>{event.title}</Text>

          {/* Pricing & Organizer Row */}
          <View style={styles.pillRow}>
            <View style={[styles.pricePill, event.is_free === false && styles.paidPricePill]}>
              <Text style={[styles.pricePillText, event.is_free === false && styles.paidPriceText]}>
                {event.is_free === false ? (event.price ? `₹${event.price}` : 'Paid Event') : 'Free Event'}
              </Text>
            </View>

            <Text style={styles.organizerLabel}>
              Organized by <Text style={styles.organizerName}>{event.organizer_name}</Text>
            </Text>
          </View>

          {/* Meta Badges Grid */}
          <View style={styles.detailsCard}>
            {/* Date */}
            <View style={styles.detailRow}>
              <View style={styles.detailIconWrapper}>
                <Calendar size={18} color={theme.colors.brand} />
              </View>
              <View style={styles.detailTextWrapper}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>{event.date_string || 'TBA'}</Text>
              </View>
            </View>

            {/* Time */}
            {(event.start_time || event.end_time) && (
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrapper}>
                  <Clock size={18} color={theme.colors.brand} />
                </View>
                <View style={styles.detailTextWrapper}>
                  <Text style={styles.detailLabel}>Time</Text>
                  <Text style={styles.detailValue}>
                    {event.start_time || ''} {event.end_time ? `- ${event.end_time}` : ''}
                  </Text>
                </View>
              </View>
            )}

            {/* Location */}
            <View style={styles.detailRow}>
              <View style={styles.detailIconWrapper}>
                {event.is_virtual ? (
                  <Video size={18} color={theme.colors.brand} />
                ) : (
                  <MapPin size={18} color={theme.colors.brand} />
                )}
              </View>
              <View style={styles.detailTextWrapper}>
                <Text style={styles.detailLabel}>Location / Venue</Text>
                <Text style={styles.detailValue}>
                  {event.is_virtual ? 'Virtual / Online Event' : event.location || event.city || 'India'}
                </Text>
              </View>
            </View>

            {/* Team Size / Audience */}
            {(event.team_size || (event.target_audience && event.target_audience.length > 0)) && (
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrapper}>
                  <Users size={18} color={theme.colors.brand} />
                </View>
                <View style={styles.detailTextWrapper}>
                  <Text style={styles.detailLabel}>Audience & Team</Text>
                  <Text style={styles.detailValue}>
                    {event.team_size ? `${event.team_size} • ` : ''}
                    {event.target_audience ? event.target_audience.join(', ') : 'Open to all'}
                  </Text>
                </View>
              </View>
            )}

            {/* Prizes */}
            {event.prizes && (
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrapper}>
                  <Award size={18} color="#EAB308" />
                </View>
                <View style={styles.detailTextWrapper}>
                  <Text style={styles.detailLabel}>Prizes / Rewards</Text>
                  <Text style={styles.detailValue}>{event.prizes}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Description Section */}
          {event.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About This Event</Text>
              <Text style={styles.descriptionText}>{event.description}</Text>
            </View>
          )}

          {/* Report Event Link */}
          <TouchableOpacity
            style={styles.reportRow}
            onPress={() => setShowReportModal(true)}
            activeOpacity={0.7}
          >
            <Flag size={14} color={theme.colors.textMuted} />
            <Text style={styles.reportText}>Report inaccurate info or spam</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Fixed Bottom Register Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.registerBtn}
          onPress={handleRegister}
          activeOpacity={0.85}
        >
          <Text style={styles.registerBtnText}>Register for Event</Text>
          <ExternalLink size={18} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Report Modal */}
      <Modal visible={showReportModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Report Event</Text>
            <Text style={styles.modalSubtitle}>
              Please describe what is incorrect or inappropriate about this listing:
            </Text>

            <TextInput
              style={styles.reportInput}
              placeholder="e.g. Expired date, broken link, offensive content..."
              placeholderTextColor={theme.colors.textMuted}
              multiline
              numberOfLines={4}
              value={reportReason}
              onChangeText={setReportReason}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowReportModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSendReport}
                disabled={isSubmittingReport}
              >
                {isSubmittingReport ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit Report</Text>
                )}
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
  },
  errorText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  backButton: {
    backgroundColor: theme.colors.brand,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
  },
  backButtonText: {
    color: '#FFF',
    fontWeight: '700',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  topNavActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnSaved: {
    backgroundColor: theme.colors.brand,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  posterContainer: {
    width: '100%',
    height: 240,
    backgroundColor: theme.colors.surfaceSecondary,
    position: 'relative',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  fallbackPoster: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  fallbackCatText: {
    fontSize: 16,
    fontWeight: '800',
  },
  categoryBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    ...theme.shadows.sm,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  mainInfo: {
    padding: theme.spacing.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    lineHeight: 28,
    marginBottom: 8,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.lg,
  },
  pricePill: {
    backgroundColor: theme.colors.successBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  pricePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.success,
  },
  paidPricePill: {
    backgroundColor: theme.colors.brandLight,
  },
  paidPriceText: {
    color: theme.colors.brand,
  },
  organizerLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  organizerName: {
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  detailsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.xl,
    gap: 14,
    ...theme.shadows.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTextWrapper: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    lineHeight: 22,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  reportText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    ...theme.shadows.md,
  },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.brand,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
    gap: 8,
    ...theme.shadows.brand,
  },
  registerBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
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
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 14,
  },
  reportInput: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    fontSize: 14,
    color: theme.colors.textPrimary,
    textAlignVertical: 'top',
    marginBottom: 16,
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
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  modalSubmitBtn: {
    backgroundColor: theme.colors.danger,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
  },
  modalSubmitText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
