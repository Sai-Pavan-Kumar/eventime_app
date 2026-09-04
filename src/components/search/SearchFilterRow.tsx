import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { CalendarDays, ChevronDown, X } from 'lucide-react-native';

export interface SearchFilterRowProps {
  selectedDate: string | null;
  onOpenDateModal: () => void;
  onToggleToday: () => void;
  isTodayActive: boolean;
  onToggleTomorrow: () => void;
  isTomorrowActive: boolean;
  selectedCity: string | null;
  cityCounts: Record<string, number>;
  onOpenCityModal: () => void;
  selectedCategory: string | null;
  categoryCounts: Record<string, number>;
  onOpenCategoryModal: () => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}

export const SearchFilterRow = React.memo<SearchFilterRowProps>(({
  selectedDate,
  onOpenDateModal,
  onToggleToday,
  isTodayActive,
  onToggleTomorrow,
  isTomorrowActive,
  selectedCity,
  cityCounts,
  onOpenCityModal,
  selectedCategory,
  categoryCounts,
  onOpenCategoryModal,
  hasActiveFilters,
  onResetFilters,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterScroll}
    >
      {/* 1. Calendar Date Button */}
      <TouchableOpacity
        style={[styles.dropdownChip, Boolean(selectedDate) && styles.chipActive]}
        onPress={onOpenDateModal}
        activeOpacity={0.8}
      >
        <CalendarDays size={14} color={selectedDate ? '#FFF' : '#6C47FF'} />
        <Text style={[styles.chipText, Boolean(selectedDate) && styles.chipTextActive]}>
          {selectedDate
            ? new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
            : 'Date'}
        </Text>
      </TouchableOpacity>

      {/* 2. Today Filter */}
      <TouchableOpacity
        style={[styles.chip, isTodayActive && styles.chipActive]}
        onPress={onToggleToday}
        activeOpacity={0.8}
      >
        <Text style={[styles.chipText, isTodayActive && styles.chipTextActive]}>
          Today
        </Text>
      </TouchableOpacity>

      {/* 3. Tomorrow Filter */}
      <TouchableOpacity
        style={[styles.chip, isTomorrowActive && styles.chipActive]}
        onPress={onToggleTomorrow}
        activeOpacity={0.8}
      >
        <Text style={[styles.chipText, isTomorrowActive && styles.chipTextActive]}>
          Tomorrow
        </Text>
      </TouchableOpacity>

      {/* 4. City Dropdown */}
      <TouchableOpacity
        style={[styles.dropdownChip, selectedCity ? styles.chipActive : null]}
        onPress={onOpenCityModal}
        activeOpacity={0.8}
      >
        <Text style={[styles.chipText, selectedCity ? styles.chipTextActive : null]}>
          {selectedCity
            ? `${selectedCity}${cityCounts[selectedCity] !== undefined ? ` (${cityCounts[selectedCity]})` : ''}`
            : 'City'}
        </Text>
        <ChevronDown size={14} color={selectedCity ? '#FFF' : '#64748B'} />
      </TouchableOpacity>

      {/* 5. Category Dropdown */}
      <TouchableOpacity
        style={[styles.dropdownChip, selectedCategory ? styles.chipActive : null]}
        onPress={onOpenCategoryModal}
        activeOpacity={0.8}
      >
        <Text style={[styles.chipText, selectedCategory ? styles.chipTextActive : null]}>
          {selectedCategory
            ? `${selectedCategory}${categoryCounts[selectedCategory] !== undefined ? ` (${categoryCounts[selectedCategory]})` : ''}`
            : 'Category'}
        </Text>
        <ChevronDown size={14} color={selectedCategory ? '#FFF' : '#64748B'} />
      </TouchableOpacity>

      {/* Clear Button if any filter is active */}
      {hasActiveFilters && (
        <TouchableOpacity style={styles.clearChip} onPress={onResetFilters} activeOpacity={0.8}>
          <X size={12} color="#EF4444" />
          <Text style={styles.clearChipText}>Reset</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dropdownChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  chipActive: {
    backgroundColor: '#6C47FF',
    borderColor: '#6C47FF',
  },
  chipText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: '#475569',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  clearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    gap: 4,
  },
  clearChipText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12,
    color: '#EF4444',
  },
});
