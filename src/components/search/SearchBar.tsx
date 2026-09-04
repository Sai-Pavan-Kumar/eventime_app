import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Search, X } from 'lucide-react-native';

export interface SearchBarProps {
  keyword: string;
  onChangeKeyword: (text: string) => void;
  onClear: () => void;
}

export const SearchBar = React.memo<SearchBarProps>(({
  keyword,
  onChangeKeyword,
  onClear,
}) => {
  return (
    <View style={styles.searchBar}>
      <Search size={18} color="#94A3B8" />
      <TextInput
        style={styles.input}
        placeholder="Search events, categories, cities, curators..."
        placeholderTextColor="#94A3B8"
        value={keyword}
        onChangeText={onChangeKeyword}
        returnKeyType="search"
        autoCapitalize="none"
      />
      {keyword.length > 0 && (
        <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <X size={16} color="#94A3B8" />
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  input: {
    flex: 1,
    fontFamily: 'Switzer-Regular',
    fontSize: 14,
    color: '#0F172A',
    height: '100%',
  },
});
