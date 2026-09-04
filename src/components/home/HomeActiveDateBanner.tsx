import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import { haptic } from '../../lib/haptics';

export interface HomeActiveDateBannerProps {
  selectedDate: string;
  onClearDate: () => void;
}

export const HomeActiveDateBanner = React.memo<HomeActiveDateBannerProps>(({
  selectedDate,
  onClearDate,
}) => {
  return (
    <View style={styles.activeDateBanner}>
      <Text style={styles.activeDateBannerText}>
        Showing events for {new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
      </Text>
      <TouchableOpacity
        onPress={() => {
          haptic.light();
          onClearDate();
        }}
        style={styles.clearActiveDateBtn}
      >
        <X size={14} color="#EF4444" />
        <Text style={styles.clearActiveDateBtnText}>Clear</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  activeDateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#DDD6FE',
  },
  activeDateBannerText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 13,
    color: '#6C47FF',
  },
  clearActiveDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  clearActiveDateBtnText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 11,
    color: '#EF4444',
  },
});
