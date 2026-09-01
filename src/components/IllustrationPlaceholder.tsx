import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image, ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';
import { theme } from '../config/theme';

interface IllustrationPlaceholderProps {
  badge?: string;
  source?: ImageSource | string | null;
  placeholderIcon?: React.ReactNode;
  gradientColors?: readonly [string, string, ...string[]];
  height?: number;
}

export function IllustrationPlaceholder({
  badge,
  source,
  placeholderIcon,
  gradientColors = ['#1E1B4B', '#0F172A'],
  height = 180,
}: IllustrationPlaceholderProps) {
  return (
    <View style={[styles.container, { height }]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {source ? (
          <Image source={source} style={styles.image} contentFit="cover" transition={300} />
        ) : (
          <View style={styles.placeholderCenter}>
            <View style={styles.iconCircle}>
              {placeholderIcon || <Sparkles size={32} color="#A78BFA" />}
            </View>
            <Text style={styles.placeholderLabel}>Vector Illustration Placeholder</Text>
          </View>
        )}

        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
    ...theme.shadows.md,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(108, 71, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.4)',
  },
  placeholderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  badge: {
    position: 'absolute',
    top: 12,
    left: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: 0.3,
  },
});
