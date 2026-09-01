import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Calendar, MapPin, Bookmark, Video, Sparkles } from 'lucide-react-native';
import { theme } from '../config/theme';
import { getCategoryMeta } from '../lib/category-config';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { EventRow } from '../types';

interface EventCardProps {
  event: EventRow;
  isSaved?: boolean;
  onPress: () => void;
  onSaveToggle?: (eventId: string, isSaved: boolean) => void;
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

  const categoryMeta = getCategoryMeta(event.category);

  const handleBookmarkPress = async (e: any) => {
    e.stopPropagation();
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to bookmark and save events to your list.');
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
      // Revert optimistic update
      setIsSaved(!nextState);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.92}
      onPress={onPress}
    >
      {/* Poster / Visual Header */}
      <View style={styles.imageContainer}>
        {event.poster_url ? (
          <Image
            source={{ uri: event.poster_url }}
            style={styles.posterImage}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <View style={[styles.fallbackBanner, { backgroundColor: categoryMeta.bgLight }]}>
            <Sparkles size={32} color={categoryMeta.accentColor} />
            <Text style={[styles.fallbackCatText, { color: categoryMeta.accentColor }]}>
              {event.category}
            </Text>
          </View>
        )}

        {/* Featured Badge */}
        {event.is_featured && (
          <View style={styles.featuredBadge}>
            <Sparkles size={11} color="#FFF" />
            <Text style={styles.featuredText}>FEATURED</Text>
          </View>
        )}

        {/* Category Pill Over Image */}
        <View
          style={[
            styles.categoryPill,
            { backgroundColor: categoryMeta.bgLight, borderColor: categoryMeta.accentColor },
          ]}
        >
          <View style={[styles.categoryDot, { backgroundColor: categoryMeta.accentColor }]} />
          <Text style={[styles.categoryPillText, { color: categoryMeta.accentColor }]}>
            {event.category}
          </Text>
        </View>

        {/* Bookmark Action Button */}
        <TouchableOpacity
          style={[styles.bookmarkBtn, isSaved && styles.bookmarkBtnActive]}
          activeOpacity={0.8}
          onPress={handleBookmarkPress}
          disabled={isSaving}
        >
          <Bookmark
            size={16}
            color={isSaved ? '#FFF' : theme.colors.textPrimary}
            fill={isSaved ? '#FFF' : 'transparent'}
          />
        </TouchableOpacity>
      </View>

      {/* Card Content Body */}
      <View style={styles.body}>
        {/* Date Row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Calendar size={13} color={theme.colors.brand} />
            <Text style={styles.dateText}>{event.date_string || 'Date TBA'}</Text>
          </View>

          {/* Pricing Pill */}
          <View style={[styles.pricePill, event.is_free === false && styles.paidPricePill]}>
            <Text style={[styles.priceText, event.is_free === false && styles.paidPriceText]}>
              {event.is_free === false ? (event.price ? `₹${event.price}` : 'Paid') : 'FREE'}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>

        {/* Location & Organizer Info */}
        <View style={styles.footerRow}>
          <View style={styles.locationContainer}>
            {event.is_virtual ? (
              <View style={styles.virtualTag}>
                <Video size={13} color={theme.colors.brand} />
                <Text style={styles.locationText}>Online / Virtual</Text>
              </View>
            ) : (
              <View style={styles.locationTag}>
                <MapPin size={13} color={theme.colors.textSecondary} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {event.city || event.location || 'India'}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.organizerText} numberOfLines={1}>
            by {event.organizer_name || 'EvenTime Curator'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  imageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
    backgroundColor: theme.colors.surfaceSecondary,
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  fallbackBanner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fallbackCatText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
    ...theme.shadows.sm,
  },
  featuredText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  categoryPill: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    ...theme.shadows.sm,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bookmarkBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  bookmarkBtnActive: {
    backgroundColor: theme.colors.brand,
  },
  body: {
    padding: theme.spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.brand,
  },
  pricePill: {
    backgroundColor: theme.colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.sm,
  },
  priceText: {
    color: theme.colors.success,
    fontSize: 11,
    fontWeight: '800',
  },
  paidPricePill: {
    backgroundColor: theme.colors.brandLight,
  },
  paidPriceText: {
    color: theme.colors.brand,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    lineHeight: 22,
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  locationContainer: {
    flex: 1,
    marginRight: 8,
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  virtualTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  organizerText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    maxWidth: 130,
    textAlign: 'right',
  },
});
