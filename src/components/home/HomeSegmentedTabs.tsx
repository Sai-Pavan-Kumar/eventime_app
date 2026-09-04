import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';

export interface TabItem {
  key: string;
  label: string;
}

export interface HomeSegmentedTabsProps {
  tabs: TabItem[];
  activeTabIdx: number;
  onSelectTab: (idx: number) => void;
  tabWidth: number;
  translateX: Animated.AnimatedInterpolation<number | string>;
}

export const HomeSegmentedTabs = React.memo<HomeSegmentedTabsProps>(({
  tabs,
  activeTabIdx,
  onSelectTab,
  tabWidth,
  translateX,
}) => {
  return (
    <View style={styles.segmentedTrackContainer}>
      <View style={styles.segmentedTrack}>
        <Animated.View
          style={[
            styles.slidingThumb,
            {
              width: tabWidth,
              transform: [{ translateX }],
            },
          ]}
        />
        <View style={styles.segmentBtnsRow}>
          {tabs.map((tab, idx) => {
            const isActive = activeTabIdx === idx;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.segmentBtn, { width: tabWidth }]}
                onPress={() => onSelectTab(idx)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    isActive && styles.segmentBtnTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  segmentedTrackContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  segmentedTrack: {
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 3,
    position: 'relative',
    justifyContent: 'center',
  },
  slidingThumb: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  segmentBtn: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  segmentBtnText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 13,
    color: '#64748B',
  },
  segmentBtnTextActive: {
    color: '#0F172A',
  },
});
