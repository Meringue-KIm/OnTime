import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, cardShadow } from '../../constants/colors';
import { getWeatherRecommendations } from '../../utils/weatherAssistant';
import type { WeatherSummary } from '../../api/weather';

interface Props {
  weather: WeatherSummary;
}

export default function WeatherAssistant({ weather }: Props) {
  const rec = getWeatherRecommendations(weather);
  return (
    <View style={styles.card}>
      <Text style={styles.title}>오늘 준비물</Text>
      <View style={styles.row}>
        <View style={styles.item}>
          <Ionicons name="shirt-outline" size={18} color={colors.primary} />
          <Text style={styles.label}>{rec.outfit}</Text>
        </View>
        {rec.umbrella && (
          <View style={styles.item}>
            <Ionicons name="umbrella-outline" size={18} color={rec.umbrella.urgent ? '#D32F2F' : '#1976D2'} />
            <Text style={[styles.label, { color: rec.umbrella.urgent ? '#D32F2F' : '#1976D2' }]}>
              {rec.umbrella.label}
            </Text>
          </View>
        )}
        {rec.tempGap && (
          <View style={styles.item}>
            <Ionicons name="thermometer-outline" size={18} color="#E65100" />
            <Text style={[styles.label, { color: '#E65100' }]}>일교차 커요 · 겉옷 챙기세요</Text>
          </View>
        )}
        {rec.sunscreen && (
          <View style={styles.item}>
            <Ionicons name="sunny-outline" size={18} color="#F9A825" />
            <Text style={[styles.label, { color: '#F9A825' }]}>자외선 강해요 · 선크림 바르세요</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card:  { marginHorizontal: 20, marginBottom: 12, backgroundColor: colors.card, borderRadius: 16, padding: 14, ...cardShadow },
  title: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.textSecondary, marginBottom: 10 },
  row:   { gap: 8 },
  item:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 13, fontFamily: fonts.regular, color: colors.textPrimary, flexShrink: 1 },
});
