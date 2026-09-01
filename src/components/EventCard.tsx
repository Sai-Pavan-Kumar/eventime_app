import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Bookmark, Share2, MapPin, Clock, Users, IndianRupee, Check } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../config/theme';
import { getCategoryConfig } from '../lib/category-config';
import { getCategoryPoster } from '../lib/asset-registry';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { parseEventDateString, formatEventTime } from '../lib/utils/date';
import type { EventRow } from '../types';

export interface EventCardProps {
  event?: EventRow;
  id?: string;
  slug?: string;
  title?: string;
  category?: string;
  dateString?: string;
  location?: string;
  city?: string;
  organizerName?: string;
  organizerUsername?: string;
  isFree?: boolean;
  isFeatured?: boolean;
  posterUrl?: string;
  interestedCount?: number;
  hideOrganizer?: boolean;
  hidePastBadge?: boolean;
  isSaved?: boolean;
  onPress?: () => void;
  onSaveToggle?: (eventId: string, isSaved: boolean) => void;
  onOrganizerPress?: () => void;
}

export const EventCard: React.FC<EventCardProps> = (props) => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const id = props.event?.id || props.id || '';
  const slug = props.event?.slug || props.slug || id;
  const title = props.event?.title || props.title || 'Event';
  const category = props.event?.category || props.category || 'General';
  const dateString = props.event?.date_string || props.dateString || '';
  const startTime = props.event?.start_time || undefined;
  const location = props.event?.location || props.location || '';
  const city = props.event?.city || props.city || '';
  const collegeName = props.event?.college_name || undefined;
  const organizerName = props.event?.organizer_name || props.organizerName || 'EvenTime Community';
  const organizerUsername = props.organizerUsername;
  const isFree = props.event?.is_free !== undefined ? props.event.is_free !== false : props.isFree !== false;
  const isFeatured = Boolean(props.event?.is_featured ?? props.isFeatured);
  const posterUrl = props.event?.poster_url || props.posterUrl;
  const interestedCount = props.event?.interested_events?.[0]?.count ?? props.event?.interested_count ?? props.interestedCount ?? 0;
  const hideOrganizer = props.hideOrganizer ?? false;
  const hidePastBadge = props.hidePastBadge ?? false;

  const [isSaved, setIsSaved] = useState(props.isSaved ?? false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const categoryConfig = getCategoryConfig(category);
  const isCustomPoster = Boolean(isFeatured && posterUrl && posterUrl.startsWith('http'));
  const posterSource = isCustomPoster ? { uri: posterUrl! } : getCategoryPoster(category);

  // Short Date Overlay e.g. "22 MAY" or "SOON"
  const parsedDate = parseEventDateString(dateString);
  const shortDateOverlay = parsedDate
    ? parsedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase()
    : 'SOON';

  // Status calculation
  const statusInfo = (() => {
    if (!parsedDate || hidePastBadge) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const evDate = new Date(parsedDate);
    evDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((evDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return { label: 'Past Event', bg: '#1E293B', color: '#F1F5F9' };
    }
    if (diffDays === 0) {
      return { label: 'Live Today', bg: '#059669', color: '#FFFFFF' };
    }
    return null;
  })();

  const handlePress = () => {
    if (props.onPress) {
      props.onPress();
    } else if (id || slug) {
      navigation.navigate('EventDetail', { id, slug, eventId: id });
    }
  };

  const handleOrganizerPress = () => {
    if (props.onOrganizerPress) {
      props.onOrganizerPress();
    } else if (organizerUsername) {
      navigation.navigate('CuratorProfile', {
        username: organizerUsername,
        name: organizerName,
      });
    }
  };

  const handleBookmarkPress = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to save events to your profile.');
      return;
    }

    const nextState = !isSaved;
    setIsSaved(nextState);
    setIsSaving(true);

    try {
      if (nextState) {
        await supabase.from('saved_events').insert({
          event_id: id,
          user_id: user.id,
        });
      } else {
        await supabase
          .from('saved_events')
          .delete()
          .eq('event_id', id)
          .eq('user_id', user.id);
      }
      props.onSaveToggle?.(id, nextState);
    } catch (err) {
      console.error('[EventCard] Save error:', err);
      setIsSaved(!nextState);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSharePress = async () => {
    try {
      const shareUrl = `https://eventime.thesurfboard.in/events/${slug || id}`;
      await Share.share({
        title: title,
        message: `${title} on ${dateString || 'Soon'} in ${city || 'Online'}\nExplore on EvenTime 🎉\n${shareUrl}`,
        url: shareUrl,
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Share error:', e);
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.92}
      onPress={handlePress}
    >
      {/* 16:9 Image Layer */}
      <View style={styles.imageContainer}>
        <Image
          source={posterSource}
          style={styles.posterImage}
          contentFit="cover"
          transition={250}
        />

        {/* Top Overlay: Date Left & Brand Name Right */}
        <View style={styles.topOverlayRow}>
          <Text
            style={[
              styles.dateOverlayText,
              { color: categoryConfig.dateColor || '#6C47FF' },
            ]}
          >
            {shortDateOverlay}
          </Text>

          <Text
            style={[
              styles.brandOverlayText,
              { color: categoryConfig.dateColor || '#6C47FF' },
            ]}
          >
            EVENTIME
          </Text>
        </View>

        {/* Bottom Left Status & Featured Badges */}
        <View style={styles.bottomOverlayCol}>
          {isFeatured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredText}>Featured</Text>
            </View>
          )}

          {statusInfo && (
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
              {statusInfo.label === 'Live Today' && <View style={styles.liveDot} />}
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Content Details */}
      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>

        {/* Organizer & Paid Rupee Indicator */}
        <View style={styles.metaRow}>
          {!hideOrganizer && (
            <Text style={styles.organizerText} numberOfLines={1}>
              Curated by{' '}
              <Text
                style={[styles.organizerHighlight, Boolean(organizerUsername) && styles.organizerLink]}
                onPress={organizerUsername ? handleOrganizerPress : undefined}
              >
                {organizerName}
              </Text>
            </Text>
          )}
          {!isFree && (
            <>
              {!hideOrganizer && <View style={styles.dotSeparator} />}
              <View style={styles.paidRupeeBadge}>
                <IndianRupee size={10} color="#FFFFFF" strokeWidth={2.5} />
              </View>
            </>
          )}
        </View>

        {/* Location / College */}
        <View style={styles.infoRow}>
          <MapPin size={13} color="#94A3B8" />
          <Text style={styles.infoText} numberOfLines={1}>
            {collegeName ? `${collegeName}, ${city || 'Online'}` : (city || 'Online')}
          </Text>
        </View>

        {/* Time & Interested Count */}
        <View style={styles.bottomRow}>
          <View style={styles.timeSection}>
            <Clock size={13} color="#94A3B8" />
            <Text style={styles.infoText} numberOfLines={1}>
              {formatEventTime(dateString, startTime)}
            </Text>
            {Boolean(interestedCount && interestedCount > 0) && (
              <>
                <View style={styles.dotSeparator} />
                <Users size={13} color="#94A3B8" />
                <Text style={styles.infoText}>{interestedCount}</Text>
              </>
            )}
          </View>

          {/* Action Buttons: Save & Share */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={handleBookmarkPress}
              disabled={isSaving}
              style={[styles.actionBtn, isSaved && styles.actionBtnSaved]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Bookmark
                size={16}
                color={isSaved ? '#6C47FF' : '#94A3B8'}
                fill={isSaved ? '#6C47FF' : 'none'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSharePress}
              style={styles.actionBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {copied ? (
                <Check size={16} color="#10B981" />
              ) : (
                <Share2 size={16} color="#94A3B8" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginBottom: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  topOverlayRow: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  dateOverlayText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  brandOverlayText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    opacity: 0.85,
  },
  bottomOverlayCol: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'column',
    gap: 6,
    alignItems: 'flex-start',
    zIndex: 10,
  },
  featuredBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  featuredText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFF',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    paddingTop: 12,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 23,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  organizerText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    flexShrink: 1,
  },
  organizerHighlight: {
    color: '#0F172A',
    fontWeight: '700',
  },
  organizerLink: {
    color: theme.colors.brand,
    textDecorationLine: 'underline',
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 6,
  },
  paidRupeeBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    flexShrink: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  timeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnSaved: {
    backgroundColor: '#EEF2FF',
  },
});
