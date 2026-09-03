import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image, ImageSource } from 'expo-image';
import { theme } from '../config/theme';
import { APP_ASSETS } from '../lib/asset-registry';

export interface EmptyStateProps {
  title: string;
  message: string;
  illustration?: ImageSource | number | string;
  buttonText?: string;
  onButtonPress?: () => void;
  illustrationHeight?: number;
}

export function EmptyState({
  title,
  message,
  illustration = APP_ASSETS.illustrations.empty,
  buttonText,
  onButtonPress,
  illustrationHeight = 180,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {illustration ? (
        <View style={[styles.illustrationWrapper, { height: illustrationHeight }]}>
          <Image
            source={illustration}
            style={styles.illustration}
            contentFit="contain"
            transition={250}
          />
        </View>
      ) : null}

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {buttonText && onButtonPress && (
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onButtonPress}
          activeOpacity={0.85}
        >
          <Text style={styles.actionBtnText}>{buttonText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
    width: '100%',
  },
  illustrationWrapper: {
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  illustration: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontFamily: 'Switzer-Regular',
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 320,
    marginBottom: 24,
  },
  actionBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  actionBtnText: {
    fontFamily: 'Switzer-Bold',
    color: '#FFFFFF',
    fontSize: 14,
    letterSpacing: -0.2,
  },
});
