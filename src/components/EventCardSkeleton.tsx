import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

/**
 * Apple-grade pulsing shimmer skeleton card matching EventCard dimensions.
 * Eliminates jarring ActivityIndicator spinners for 60fps perceived fluidity.
 */
export const EventCardSkeleton: React.FC = () => {
  const pulseAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.card}>
      {/* Media Poster Placeholder */}
      <Animated.View style={[styles.posterSkeleton, { opacity: pulseAnim }]} />

      {/* Content Skeleton */}
      <View style={styles.content}>
        {/* Title Bar */}
        <Animated.View style={[styles.titleSkeleton, { opacity: pulseAnim }]} />

        {/* Organizer & Meta Line */}
        <View style={styles.metaRow}>
          <Animated.View style={[styles.avatarSkeleton, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.metaTextSkeleton, { opacity: pulseAnim }]} />
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Footer Chips */}
        <View style={styles.footerRow}>
          <Animated.View style={[styles.badgeSkeleton, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.badgeSkeletonSmall, { opacity: pulseAnim }]} />
        </View>
      </View>
    </View>
  );
};

/**
 * Standard feed skeleton displaying 3 stacked pulsing cards.
 */
export const FeedSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <View style={styles.feedContainer}>
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  feedContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  posterSkeleton: {
    width: '100%',
    height: 180,
    backgroundColor: '#E2E8F0',
  },
  content: {
    padding: 16,
  },
  titleSkeleton: {
    height: 18,
    width: '75%',
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  avatarSkeleton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E2E8F0',
  },
  metaTextSkeleton: {
    height: 12,
    width: '45%',
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeSkeleton: {
    height: 22,
    width: 110,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
  },
  badgeSkeletonSmall: {
    height: 22,
    width: 70,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
  },
});
