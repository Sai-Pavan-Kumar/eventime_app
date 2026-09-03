import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Search, X, Check } from 'lucide-react-native';
import { theme } from '../config/theme';

export interface SelectPickerModalProps {
  visible: boolean;
  title: string;
  items: readonly string[] | string[];
  selectedItem?: string | null;
  itemCounts?: Record<string, number>;
  onSelect: (item: string) => void;
  onClose: () => void;
  searchPlaceholder?: string;
  allowClear?: boolean;
  clearLabel?: string;
  onClear?: () => void;
}

export function SelectPickerModal({
  visible,
  title,
  items,
  selectedItem = '',
  itemCounts,
  onSelect,
  onClose,
  searchPlaceholder = 'Search...',
  allowClear = false,
  clearLabel = 'All',
  onClear,
}: SelectPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = items.filter((item) =>
    item.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.container}
          onPress={() => {}}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{title}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.7}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchWrapper}>
            <Search size={16} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder={searchPlaceholder}
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Items List */}
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              allowClear && onClear ? (
                <TouchableOpacity
                  style={[styles.itemRow, !selectedItem && styles.itemRowActive]}
                  onPress={() => {
                    onClear();
                    handleClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemTextContainer}>
                    <Text style={[styles.itemText, !selectedItem && styles.itemTextActive]}>
                      {clearLabel}
                    </Text>
                    {itemCounts && (
                      <View style={[styles.countBadge, !selectedItem && styles.countBadgeSelected]}>
                        <Text style={[styles.countText, !selectedItem && styles.countTextSelected]}>
                          {Object.values(itemCounts).reduce((a, b) => a + b, 0)}
                        </Text>
                      </View>
                    )}
                  </View>
                  {!selectedItem && <Check size={18} color={theme.colors.brand} />}
                </TouchableOpacity>
              ) : null
            }
            renderItem={({ item }) => {
              const isSelected = selectedItem && item.toLowerCase() === selectedItem.toLowerCase();
              const count = itemCounts ? (itemCounts[item] ?? itemCounts[item.toLowerCase()] ?? 0) : undefined;
              return (
                <TouchableOpacity
                  style={[styles.itemRow, isSelected && styles.itemRowActive]}
                  onPress={() => {
                    onSelect(item);
                    handleClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemTextContainer}>
                    <Text style={[styles.itemText, isSelected && styles.itemTextActive]}>
                      {item}
                    </Text>
                    {count !== undefined && (
                      <View style={[styles.countBadge, count > 0 && styles.countBadgeActive, isSelected && styles.countBadgeSelected]}>
                        <Text style={[styles.countText, count > 0 && styles.countTextActive, isSelected && styles.countTextSelected]}>
                          {count}
                        </Text>
                      </View>
                    )}
                  </View>
                  {isSelected && <Check size={18} color={theme.colors.brand} />}
                </TouchableOpacity>
              );
            }}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: '#0F172A',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Switzer-Regular',
    fontSize: 14,
    color: '#0F172A',
    padding: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    borderRadius: 10,
  },
  itemRowActive: {
    backgroundColor: '#F5F3FF',
  },
  itemText: {
    fontFamily: 'Switzer-Medium',
    fontSize: 14,
    color: '#334155',
  },
  itemTextActive: {
    fontFamily: 'Switzer-Bold',
    color: theme.colors.brand,
  },
  itemTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  countBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeActive: {
    backgroundColor: '#EEF2FF',
  },
  countBadgeSelected: {
    backgroundColor: '#6C47FF',
  },
  countText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 11,
    color: '#94A3B8',
  },
  countTextActive: {
    color: '#6C47FF',
  },
  countTextSelected: {
    color: '#FFFFFF',
  },
});
