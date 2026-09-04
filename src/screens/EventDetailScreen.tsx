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
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  CalendarPlus,
  Heart,
  Edit3,
  Building,
  GraduationCap,
  Sparkles,
  Hourglass,
  Tag,
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { theme } from '../config/theme';
import { getCategoryConfig } from '../lib/category-config';
import { APP_ASSETS, getCategoryPoster } from '../lib/asset-registry';
import { scheduleEventReminder } from '../lib/notifications';
import { useAuth } from '../context/AuthContext';
import { EventCard } from '../components/EventCard';
import { EmptyState } from '../components/EmptyState';
import { formatEventDateDetailed, parseEventDateString, formatEventTime } from '../lib/utils/date';
import type { EventRow, RootStackParamList } from '../types';

const { width } = Dimensions.get('window');

export default function EventDetailScreen() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 24);
  const route = useRoute<RouteProp<RootStackParamList, 'EventDetail'>>();
  const navigation = useNavigation<any>();
  const { user, profile } = useAuth();

  const { slug, id, eventId } = (route.params || {}) as any;

  const [event, setEvent] = useState<(EventRow & { colleges?: { name: string }; profiles?: { username?: string; full_name?: string } }) | null>(null);
  const [similarEvents, setSimilarEvents] = useState<EventRow[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isInterested, setIsInterested] = useState(false);
  const [interestCount, setInterestCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingInterest, setIsUpdatingInterest] = useState(false);

  // Report Modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const isStudent = profile?.user_type === 'student';
  const userCollege = profile?.college || event?.colleges?.name || '';

  const isPast = (() => {
    if (!event?.date_string) return false;
    const parsed = parseEventDateString(event.date_string);
    if (!parsed) return false;
    const endOfDay = new Date(parsed);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay.getTime() < Date.now();
  })();

  const fetchSimilarEvents = useCallback(async (currentEvent: EventRow) => {
    try {
      let query = supabase
        .from('events')
        .select('*, colleges(name)')
        .eq('status', 'approved')
        .neq('id', currentEvent.id)
        .limit(6);

      if (currentEvent.category) {
        query = query.eq('category', currentEvent.category);
      } else if (currentEvent.city && currentEvent.city !== 'Online') {
        query = query.eq('city', currentEvent.city);
      }

      const { data } = await query;
      if (data && data.length > 0) {
        setSimilarEvents(data as EventRow[]);
      } else {
        // Fallback to latest approved events so the stream never reaches a dead end
        const { data: fallback } = await supabase
          .from('events')
          .select('*, colleges(name)')
          .eq('status', 'approved')
          .neq('id', currentEvent.id)
          .order('created_at', { ascending: false })
          .limit(6);
        if (fallback) {
          setSimilarEvents(fallback as EventRow[]);
        }
      }
    } catch (e) {
      console.warn('[EventDetail] Failed to load similar events', e);
    }
  }, []);

  const fetchEvent = useCallback(async () => {
    try {
      let query = supabase.from('events').select('*, colleges(name), profiles(username, full_name), interested_events(count)');

      const targetId = eventId || id;
      if (targetId) {
        query = query.eq('id', targetId);
      } else if (slug) {
        query = query.eq('slug', slug);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      setEvent(data as any);

      if (data) {
        const initialCount = (data as any).interested_events?.[0]?.count ?? (data as any).interested_count ?? 0;
        setInterestCount(initialCount);

        // Fetch related/similar events
        fetchSimilarEvents(data as EventRow);

        if (user) {
          const [{ data: savedRow }, { data: interestRow }] = await Promise.all([
            supabase
              .from('saved_events')
              .select('id')
              .eq('event_id', data.id)
              .eq('user_id', user.id)
              .maybeSingle(),
            supabase
              .from('interested_events')
              .select('id')
              .eq('event_id', data.id)
              .eq('user_id', user.id)
              .maybeSingle(),
          ]);

          setIsSaved(!!savedRow);
          setIsInterested(!!interestRow);
        }
      }
    } catch (err) {
      console.error('[EventDetail] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id, slug, eventId, user, fetchSimilarEvents]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const canEdit = Boolean(
    user &&
    event &&
    (user.id === event.creator_id || profile?.role === 'admin' || profile?.user_type === 'admin')
  );

  const handleEditEvent = () => {
    if (!event) return;
    navigation.navigate('CreateEvent', {
      editId: event.id,
      event,
    });
  };

  const handleShare = async () => {
    if (!event) return;
    try {
      const shareUrl = `https://eventime.thesurfboard.in/events/${event.slug || event.id}`;
      await Share.share({
        title: event.title,
        message: `${event.title} on ${event.date_string || 'Soon'} in ${event.city || 'Online'}\nExplore on EvenTime 🎉\n${shareUrl}`,
        url: shareUrl,
      });
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  const handleBookmarkToggle = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to save this event to your profile.');
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
        scheduleEventReminder(event);
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

  const handleInterestedToggle = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to mark your interest in this event.');
      return;
    }
    if (!event || isUpdatingInterest) return;

    const previousState = isInterested;
    const nextState = !previousState;

    setIsInterested(nextState);
    setInterestCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));
    setIsUpdatingInterest(true);

    try {
      if (nextState) {
        const { data: inserted, error } = await supabase
          .from('interested_events')
          .upsert(
            { event_id: event.id, user_id: user.id },
            { onConflict: 'event_id,user_id', ignoreDuplicates: true }
          )
          .select();

        if (error) throw error;

        if (event.creator_id && inserted && inserted.length > 0) {
          await supabase.rpc('increment_et_score', {
            user_id: event.creator_id,
            delta: 10,
          } as any);
        }
      } else {
        const { error } = await supabase
          .from('interested_events')
          .delete()
          .eq('event_id', event.id)
          .eq('user_id', user.id);

        if (error) throw error;
      }
    } catch (err) {
      console.error('[EventDetail] Interested error:', err);
      setIsInterested(previousState);
      setInterestCount((prev) => (previousState ? prev + 1 : Math.max(0, prev - 1)));
      Alert.alert('Error', 'Could not update interest status.');
    } finally {
      setIsUpdatingInterest(false);
    }
  };

  const handleAddToCalendar = async () => {
    if (!event) return;
    try {
      const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
      const title = encodeURIComponent(`${event.title} · via EvenTime`);
      const dateStr = event.date_string?.replace(/-/g, '') ?? '';
      const dates = dateStr ? `${dateStr}/${dateStr}` : '';
      const details = encodeURIComponent(event.description ?? '');
      const location = encodeURIComponent(event.is_virtual ? 'Online' : (event.location || event.city || ''));
      const url = `${base}&text=${title}&dates=${dates}&details=${details}&location=${location}`;

      await WebBrowser.openBrowserAsync(url);
    } catch (err) {
      console.error('[EventDetail] Add to calendar error:', err);
      Alert.alert('Error', 'Could not open calendar.');
    }
  };

  const handleOrganizerPress = () => {
    const username = event?.profiles?.username;
    if (username) {
      navigation.navigate('CuratorProfile', {
        username,
        name: event?.organizer_name,
      });
    } else if (event?.creator_id) {
      navigation.navigate('CuratorProfile', {
        userId: event.creator_id,
        name: event?.organizer_name,
      });
    }
  };

  const handleRegister = async () => {
    const rawLink = (event?.registration_link || event?.website || event?.external_link || '').trim();
    if (!rawLink) {
      Alert.alert('No Link Provided', 'Organizer did not specify a registration link.');
      return;
    }

    try {
      const formattedUrl = rawLink.startsWith('http://') || rawLink.startsWith('https://')
        ? rawLink
        : `https://${rawLink}`;
      await WebBrowser.openBrowserAsync(encodeURI(formattedUrl));
    } catch (err) {
      console.error('[EventDetail] Open registration link error:', err);
      Alert.alert('Unable to Open Link', 'The registration link provided for this event is invalid or cannot be opened.');
    }
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
      <SafeAreaView style={styles.center} edges={['top']}>
        <EmptyState
          illustration={APP_ASSETS.illustrations.notFound}
          title="Event Not Found"
          message="The event you are looking for might have ended, been removed, or the link has expired."
          buttonText="Go Back"
          onButtonPress={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  const categoryConfig = getCategoryConfig(event.category);
  const isCustomPoster = Boolean(event.is_featured && event.poster_url && event.poster_url.startsWith('http'));
  const posterSource = isCustomPoster ? { uri: event.poster_url! } : getCategoryPoster(event.category);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header Bar */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.topNavActions}>
          {/* Edit Event Button (Visible to Creator / Admin) */}
          {canEdit && (
            <TouchableOpacity
              style={styles.editHeaderBtn}
              onPress={handleEditEvent}
              activeOpacity={0.8}
            >
              <Edit3 size={15} color="#6C47FF" />
              <Text style={styles.editHeaderText}>Edit</Text>
            </TouchableOpacity>
          )}

          {/* Interested Button in Header */}
          <TouchableOpacity
            style={[styles.interestedHeaderBtn, isInterested && styles.interestedHeaderBtnActive]}
            onPress={handleInterestedToggle}
            activeOpacity={0.8}
          >
            <Heart
              size={15}
              color={isInterested ? '#EF4444' : '#64748B'}
              fill={isInterested ? '#EF4444' : 'none'}
            />
            <Text style={[styles.interestedHeaderText, isInterested && styles.interestedHeaderTextActive]}>
              {interestCount > 0 ? `${interestCount}` : 'Interested'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
            <Share2 size={18} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconBtn, isSaved && styles.iconBtnSaved]}
            onPress={handleBookmarkToggle}
            disabled={isSaving}
          >
            <Bookmark
              size={18}
              color={isSaved ? '#FFF' : theme.colors.textPrimary}
              fill={isSaved ? '#FFF' : 'transparent'}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + bottomPadding }]}
      >
        {/* Poster Media */}
        <View style={styles.posterContainer}>
          <Image
            source={posterSource}
            style={styles.posterImage}
            contentFit="cover"
            transition={300}
          />
        </View>

        {/* Event Main Info */}
        <View style={styles.mainInfo}>
          <Text style={styles.title}>{event.title}</Text>

          {/* Organizer Attribution Row */}
          <View style={styles.pillRow}>
            <TouchableOpacity onPress={handleOrganizerPress} activeOpacity={0.7}>
              <Text style={styles.organizerLabel}>
                Curated by{' '}
                <Text style={styles.organizerName}>
                  {event.profiles?.full_name || event.organizer_name || 'EvenTime Community'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Goal Tags (If present) */}
          {event.goal_tags && event.goal_tags.length > 0 && (
            <View style={styles.goalTagsContainer}>
              {event.goal_tags.map((goal, idx) => (
                <View key={idx} style={styles.goalChip}>
                  <Text style={styles.goalChipText}>{goal}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Role-Gated Real-Action Attendance Bar (Linked 1:1 to interested_events) */}
          <TouchableOpacity
            style={[styles.socialProofBar, isInterested && styles.socialProofBarActive]}
            onPress={handleInterestedToggle}
            activeOpacity={0.85}
          >
            <View style={[styles.socialProofIconBox, isInterested && styles.socialProofIconBoxActive]}>
              {isStudent ? (
                <GraduationCap size={16} color={isInterested ? '#EF4444' : '#6C47FF'} />
              ) : (
                <Users size={16} color={isInterested ? '#EF4444' : '#6C47FF'} />
              )}
            </View>

            <View style={styles.socialProofTextBox}>
              <Text style={[styles.socialProofTitle, isInterested && styles.socialProofTitleActive]} numberOfLines={1}>
                {isStudent
                  ? interestCount > 0
                    ? isInterested
                      ? interestCount === 1
                        ? `You're going · ${userCollege || 'Your College'}`
                        : `You & ${interestCount - 1} ${interestCount - 1 === 1 ? 'other student' : 'other students'} are going · ${userCollege || 'Campus'}`
                      : `${interestCount} ${interestCount === 1 ? 'student is' : 'students are'} going · ${event.colleges?.name || userCollege || 'Campus'}`
                    : `Be the first from ${userCollege || 'your college'} to show interest`
                  : interestCount > 0
                  ? isInterested
                    ? interestCount === 1
                      ? `You're going · ${event.city || 'Local'}`
                      : `You & ${interestCount - 1} ${interestCount - 1 === 1 ? 'other person' : 'others'} are going · ${event.city || 'Local'}`
                    : `${interestCount} ${interestCount === 1 ? 'person is' : 'people are'} interested · ${event.city || 'Local'}`
                  : `Be the first in ${event.city || 'your city'} to show interest`}
              </Text>
              <Text style={styles.socialProofSub}>
                {isInterested ? 'You are marked as interested · Tap to remove' : 'Tap to show you are interested'}
              </Text>
            </View>

            <View style={[styles.socialProofPill, isInterested && styles.socialProofPillActive]}>
              <Heart
                size={12}
                color={isInterested ? '#FFFFFF' : '#6C47FF'}
                fill={isInterested ? '#FFFFFF' : 'none'}
              />
              <Text style={[styles.socialProofPillText, isInterested && styles.socialProofPillTextActive]}>
                {isInterested ? 'Interested' : "I'm Interested"}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Quick Action Strip: Add to Calendar */}
          <View style={styles.actionStrip}>
            <TouchableOpacity
              style={styles.calendarActionBtn}
              onPress={handleAddToCalendar}
              activeOpacity={0.8}
            >
              <CalendarPlus size={16} color={theme.colors.brand} />
              <Text style={styles.calendarActionText}>Add to Calendar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.interestedBigBtn, isInterested && styles.interestedBigBtnActive]}
              onPress={handleInterestedToggle}
              activeOpacity={0.8}
            >
              <Heart
                size={16}
                color={isInterested ? '#EF4444' : '#0F172A'}
                fill={isInterested ? '#EF4444' : 'none'}
              />
              <Text style={[styles.interestedBigText, isInterested && styles.interestedBigTextActive]}>
                {isInterested ? 'Interested' : 'I\'m Interested'} ({interestCount})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Meta Details Card */}
          <View style={styles.detailsCard}>
            {/* 1. Date (Day, Month, Date) */}
            <View style={styles.detailRow}>
              <View style={styles.detailIconWrapper}>
                <Calendar size={18} color={theme.colors.brand} />
              </View>
              <View style={styles.detailTextWrapper}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>
                  {formatEventDateDetailed(event.date_string)}
                  {event.end_date_string && event.end_date_string !== event.date_string
                    ? ` - ${formatEventDateDetailed(event.end_date_string)}`
                    : ''}
                </Text>
              </View>
            </View>

            {/* 2. Time */}
            {(event.start_time || event.end_time || event.date_string) && (
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrapper}>
                  <Clock size={18} color={theme.colors.brand} />
                </View>
                <View style={styles.detailTextWrapper}>
                  <Text style={styles.detailLabel}>Time</Text>
                  <Text style={styles.detailValue}>
                    {formatEventTime(event.date_string, event.start_time)}
                    {event.end_time ? ` - ${event.end_time}` : ''}
                  </Text>
                </View>
              </View>
            )}

            {/* 3. Location (if available or virtual) */}
            {(Boolean(event.location) || Boolean(event.is_virtual)) && (
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrapper}>
                  {event.is_virtual ? (
                    <Video size={18} color={theme.colors.brand} />
                  ) : (
                    <MapPin size={18} color={theme.colors.brand} />
                  )}
                </View>
                <View style={styles.detailTextWrapper}>
                  <Text style={styles.detailLabel}>
                    {event.is_virtual ? 'Event Mode' : 'Location / Venue'}
                  </Text>
                  <Text style={styles.detailValue}>
                    {event.is_virtual ? 'Virtual / Online Event' : event.location}
                  </Text>
                </View>
              </View>
            )}

            {/* 4. City */}
            <TouchableOpacity
              style={styles.detailRow}
              onPress={() => event.city && !event.is_virtual && navigation.navigate('CityEvents', { city: event.city })}
              activeOpacity={event.is_virtual ? 1 : 0.7}
            >
              <View style={styles.detailIconWrapper}>
                <Building size={18} color={theme.colors.brand} />
              </View>
              <View style={styles.detailTextWrapper}>
                <Text style={styles.detailLabel}>City</Text>
                <Text style={styles.detailValue}>
                  {event.is_virtual ? 'Online / Remote' : event.city || 'India'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* 5. Registration Price (if it is a paid event) */}
            {(event.is_free === false || Boolean(event.price)) && (
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrapper}>
                  <Tag size={18} color={theme.colors.brand} />
                </View>
                <View style={styles.detailTextWrapper}>
                  <Text style={styles.detailLabel}>Registration Fee</Text>
                  <Text style={[styles.detailValue, { color: '#B45309', fontWeight: '800' }]}>
                    {event.price ? `₹${event.price}` : 'Paid Event'}
                  </Text>
                </View>
              </View>
            )}

            {/* Registration Deadline (If present) */}
            {event.registration_deadline && (
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrapper}>
                  <Hourglass size={18} color={theme.colors.brand} />
                </View>
                <View style={styles.detailTextWrapper}>
                  <Text style={styles.detailLabel}>Registration Deadline</Text>
                  <Text style={styles.detailValue}>{event.registration_deadline}</Text>
                </View>
              </View>
            )}

            {/* College Specific Details */}
            {(event.colleges?.name || event.college_only) && (
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrapper}>
                  <Building size={18} color={theme.colors.brand} />
                </View>
                <View style={styles.detailTextWrapper}>
                  <Text style={styles.detailLabel}>College Hosted</Text>
                  <Text style={styles.detailValue}>
                    {event.colleges?.name || 'College Specific Event'}
                    {event.college_only ? ' (Exclusive to Students)' : ''}
                  </Text>
                </View>
              </View>
            )}

            {/* Eligible Branches */}
            {(event.college_branch || (event.branch_tags && event.branch_tags.length > 0)) && (
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrapper}>
                  <GraduationCap size={18} color={theme.colors.brand} />
                </View>
                <View style={styles.detailTextWrapper}>
                  <Text style={styles.detailLabel}>Eligible Branches</Text>
                  <Text style={styles.detailValue}>
                    {event.college_branch || event.branch_tags?.join(', ')}
                  </Text>
                </View>
              </View>
            )}

            {/* Prizes */}
            {event.prizes && (
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrapper}>
                  <Award size={18} color={theme.colors.brand} />
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

          {/* Similar Events / More in this City Carousel */}
          {similarEvents.length > 0 && (
            <View style={styles.similarSection}>
              <View style={styles.similarHeader}>
                <Text style={styles.similarTitle}>
                  More Events in {event.category || event.city || 'EvenTime'}
                </Text>
                <Text style={styles.similarSubtitle}>
                  Similar events happening near you
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.similarScrollContainer}
              >
                {similarEvents.map((simEvent) => (
                  <View key={simEvent.id} style={styles.similarCardWrapper}>
                    <EventCard
                      event={simEvent}
                      onPress={() => {
                        navigation.push('EventDetail', { id: simEvent.id, slug: simEvent.slug ?? undefined });
                      }}
                    />
                  </View>
                ))}
              </ScrollView>
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
      <View style={[styles.bottomBar, { paddingBottom: bottomPadding + 6 }]}>
        <TouchableOpacity
          style={[styles.registerBtn, isPast && styles.registerBtnDisabled]}
          onPress={isPast ? undefined : handleRegister}
          activeOpacity={isPast ? 1 : 0.85}
          disabled={isPast || !event?.registration_link}
        >
          <Text style={[styles.registerBtnText, isPast && styles.registerBtnTextDisabled]}>
            {isPast ? 'Event Concluded' : 'Register for Event'}
          </Text>
          {!isPast && <ExternalLink size={18} color="#FFF" />}
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
    backgroundColor: '#F8FAFC',
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  topNavActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  editHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6C47FF',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnSaved: {
    backgroundColor: theme.colors.brand,
  },
  interestedHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
  },
  interestedHeaderBtnActive: {
    backgroundColor: '#FEE2E2',
  },
  interestedHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  interestedHeaderTextActive: {
    color: '#EF4444',
  },
  scrollContent: {
    paddingBottom: 110,
  },
  posterContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
  },
  categoryBadgeText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 11,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mainInfo: {
    padding: 18,
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    color: '#0F172A',
    lineHeight: 28,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  pricePill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pricePillText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 11,
    color: '#059669',
  },
  paidPricePill: {
    backgroundColor: '#EEF2FF',
  },
  paidPriceText: {
    color: theme.colors.brand,
  },
  organizerLabel: {
    fontFamily: 'Switzer-Regular',
    fontSize: 13,
    color: '#64748B',
  },
  organizerName: {
    fontFamily: 'Switzer-Bold',
    color: theme.colors.brand,
    textDecorationLine: 'underline',
  },
  goalTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  goalChipText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 11,
    color: '#6C47FF',
  },
  // Role-Gated Attendance Social Proof Bar
  socialProofBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  socialProofBarActive: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  socialProofIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialProofIconBoxActive: {
    backgroundColor: '#FEE2E2',
  },
  socialProofTextBox: {
    flex: 1,
  },
  socialProofTitle: {
    fontFamily: 'Switzer-Bold',
    fontSize: 13,
    color: '#0F172A',
    lineHeight: 18,
  },
  socialProofTitleActive: {
    color: '#6C47FF',
  },
  socialProofSub: {
    fontFamily: 'Switzer-Regular',
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  socialProofPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  socialProofPillActive: {
    backgroundColor: '#EF4444',
  },
  socialProofPillText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 11,
    color: '#6C47FF',
  },
  socialProofPillTextActive: {
    color: '#FFFFFF',
  },
  actionStrip: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  calendarActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  calendarActionText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: theme.colors.brand,
  },
  interestedBigBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  interestedBigBtnActive: {
    backgroundColor: '#FEE2E2',
  },
  interestedBigText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: '#0F172A',
  },
  interestedBigTextActive: {
    color: '#EF4444',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    gap: 14,
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
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  detailTextWrapper: {
    flex: 1,
  },
  detailLabel: {
    fontFamily: 'Switzer-Bold',
    fontSize: 11,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontFamily: 'Switzer-Bold',
    fontSize: 14,
    color: '#0F172A',
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 17,
    color: '#0F172A',
    marginBottom: 8,
  },
  descriptionText: {
    fontFamily: 'Switzer-Regular',
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },
  similarSection: {
    marginBottom: 20,
  },
  similarHeader: {
    marginBottom: 12,
  },
  similarTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 17,
    color: '#0F172A',
  },
  similarSubtitle: {
    fontFamily: 'Switzer-Regular',
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  similarScrollContainer: {
    paddingRight: 16,
    gap: 12,
  },
  similarCardWrapper: {
    width: width * 0.78,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  reportText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 12,
    color: '#94A3B8',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 6,
  },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.brand,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  registerBtnText: {
    fontFamily: 'Outfit-Bold',
    color: '#FFF',
    fontSize: 16,
  },
  registerBtnDisabled: {
    backgroundColor: '#E2E8F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  registerBtnTextDisabled: {
    color: '#94A3B8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  modalTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: '#0F172A',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontFamily: 'Switzer-Regular',
    fontSize: 13,
    color: '#64748B',
    marginBottom: 14,
  },
  reportInput: {
    fontFamily: 'Switzer-Regular',
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
  modalSubmitBtn: {
    backgroundColor: theme.colors.danger,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalSubmitText: {
    fontFamily: 'Switzer-Bold',
    color: '#FFF',
    fontSize: 14,
  },
});
