import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { searchPlaces, PlaceSuggestion } from '../api/kakao';

interface Props {
  value: string;
  onChange: (text: string) => void;
  onSelect: (address: string, lat: number, lng: number) => void;
  placeholder?: string;
  iconName?: string;
  isSelected?: boolean;
}

export default function AddressInput({ value, onChange, onSelect, placeholder = '주소 입력', iconName = 'location-outline', isSelected = false }: Props) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback((text: string) => {
    onChange(text);
    setSearchFailed(false);
    setNoResults(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim() || text.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await searchPlaces(text.trim());
        setSuggestions(data);
        setNoResults(data.length === 0);
        setSearchFailed(false);
      } catch {
        setSuggestions([]);
        setSearchFailed(true);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, [onChange]);

  const handleSelect = (item: PlaceSuggestion) => {
    onChange(item.address);
    onSelect(item.address, item.lat, item.lng);
    setSuggestions([]);
    setNoResults(false);
    setSearchFailed(false);
  };

  return (
    <View>
      <View style={styles.inputWrap}>
        <Ionicons name={iconName as any} size={16} color={colors.textMuted} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
        />
        {searching && <ActivityIndicator size="small" color={colors.primary} />}
        {!searching && isSelected && <Ionicons name="checkmark-circle" size={16} color={colors.success} />}
        {!searching && !isSelected && value.length > 0 && (
          <TouchableOpacity onPress={() => { onChange(''); setSuggestions([]); setNoResults(false); }}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {searchFailed && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={13} color={colors.warning} />
          <Text style={styles.errorText}>주소 검색에 실패했습니다. 네트워크를 확인해주세요.</Text>
        </View>
      )}
      {!searchFailed && noResults && (
        <View style={styles.errorRow}>
          <Ionicons name="search-outline" size={13} color={colors.textMuted} />
          <Text style={[styles.errorText, { color: colors.textMuted }]}>검색 결과가 없습니다.</Text>
        </View>
      )}
      {!searchFailed && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={suggestions}
            keyExtractor={(_, i) => String(i)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.item} onPress={() => handleSelect(item)}>
                <Ionicons name="location" size={14} color={colors.primary} style={styles.itemIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.itemAddr} numberOfLines={1}>{item.address}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrap:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  input:      { flex: 1, fontSize: 14, color: colors.textPrimary },
  dropdown:   { backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border, marginTop: 4, maxHeight: 200, zIndex: 999 },
  item:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemIcon:   { marginRight: 8 },
  itemName:   { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  itemAddr:   { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  errorRow:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4, paddingHorizontal: 4 },
  errorText:  { fontSize: 11, color: colors.warning },
});
