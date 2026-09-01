import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Bookmark, Share2, MapPin, Clock, Users, IndianRupee, Sparkles, Check } from 'lucide-react-native';
import { theme } from '../config/theme';
import { getCategoryConfig } from '../lib/category-config';
import { getCategoryPoster } from '../lib/asset-registry';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { parseEventDateString } from '../lib/utils/date';
import type { EventRow } from '../types';

interface EventCardProps {
  event: EventRow;
  isSaved?: boolean;
  onPress: () => void;
  onSaveToggle?: (eventId: string, isSaved: boolean) => void;
  layout?: 'grid' | 'full';
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  isSaved: initialIsSaved = false,
  onPress,
  onSaveToggle,
}) => {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const categoryConfig = getCategoryConfig(event.category);
  const isCustomPoster = Boolean(event.is_featured && event.poster_url && event.poster_url.startsWith('http'));
  const posterSource = isCustomPoster ? { uri: event.poster_url! } : getCategoryPoster(event.category);

  // Date parsing & FOMO Status
  const parsedDate = parseEventDateString(event.date_string || '');
  const shortDateOverlay = parsedDate
    ? parsedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase()
    : 'SOON';

  const isPastEvent = (() => {
    if (!parsedDate) return false;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const evDate = new Date(parsedDate);
    evDate.setHours(0, 0, 0, 0);
    return evDate.getTime() < now.getTime();
  })();

  const isFree = event.is_free !== false;

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
      onSaveToggle?.(event.id, nextState);
    } catch (err) {
      console.error('[EventCard] Save error:', err);
      setIsSaved(!nextState);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSharePress = async () => {
    try {
      const shareUrl = `https://eventime.in/events/${event.slug || event.id}`;
      await Share.share({
        title: event.title,
        message: `${event.title} on ${event.date_string || 'Soon'} in ${event.city || 'Online'}\nExplore on EvenTime 🎉\n${shareUrl}`,
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
      activeOpacity={0.93}
      onPress={onPress}
    >
      {/* Visual Image Banner with 100% genuine WebP */}
      <View style={styles.imageContainer}>
        <Image
          source={posterSource}
          style={styles.posterImage}
          contentFit="cover"
          transition={250}
        />

        {/* Short Date Badge Overlay */}
        <View style={styles.dateOverlay}>
          <Text style={[styles.dateOverlayText, { color: categoryConfig.dateColor || '#6C47FF' }]}>
            {shortDateOverlay}
          </Text>
        </View>

        {/* Category Pill Over Image */}
        <View style={styles.categoryPill}>
          <Text style={styles.categoryPillText} numberOfLines={1}>
            {event.category || 'Event'}
          </Text>
        </View>

        {/* Featured Badge */}
        {event.is_featured && (
          <View style={styles.featuredBadge}>
            <Sparkles size={10} color="#FFF" />
            <Text style={styles.featuredText}>FEATURED</Text>
          </View>
        )}

        {/* Past Event Badge */}
        {isPastEvent && (
          <View style={styles.pastBadge}>
            <Text style={styles.pastText}>Past Event</Text>
          </View>
        )}
      </View>

      {/* Card Content Matching Website Details */}
      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>

        {/* Organizer & Price */}
        <View style={styles.metaRow}>
          <Text style={styles.organizerText} numberOfLines={1}>
            Curated by <Text style={styles.organizerHighlight}>{event.organizer_name || 'EvenTime Community'}</Text>
          </Text>
          <View style={styles.dotSeparator} />
          {isFree ? (
            <View style={styles.freeBadge}>
              <Text style={styles.freeText}>FREE</Text>
            </View>
          ) : (
            <View style={styles.paidBadge}>
              <IndianRupee size={11} color="#059669" />
              <Text style={styles.paidText}>PAID</Text>
            </View>
          )}
        </View>

        {/* Location / College */}
        <View style={styles.infoRow}>
          <MapPin size={13} color="#94A3B8" />
          <Text style={styles.infoText} numberOfLines={1}>
            {event.college_name ? `${event.college_name}, ${event.city || 'Online'}` : (event.city || 'Online / Virtual')}
          </Text>
        </View>

        {/* Time & Interested Count */}
        <View style={styles.bottomRow}>
          <View style={styles.timeSection}>
            <Clock size={13} color="#94A3B8" />
            <Text style={styles.infoText} numberOfLines={1}>
              {event.date_string?.includes('·') ? event.date_string.split('·')[1].trim() : 'TBA'}
            </Text>
            {Boolean(event.interested_count && event.interested_count > 0) && (
              <>
                <View style={styles.dotSeparator} />
                <Users size={13} color="#94A3B8" />
                <Text style={styles.infoText}>{event.interested_count}</Text>
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
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  dateOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  dateOverlayText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  categoryPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    maxWidth: '55%',
  },
  categoryPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  featuredBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: '#6C47FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featuredText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pastBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pastText: {
    color: '#F1F5F9',
    fontSize: 10,
    fontWeight: '700',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 23,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 6,
  },
  freeBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  freeText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  paidText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
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
