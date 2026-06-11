import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, cardShadow } from '../../constants/colors';
import { getWeatherIonicon } from '../../utils/weather';
import { CITIES, type City } from '../../constants/locations';
import type { WeatherSummary } from '../../api/weather';

interface Props {
  weather: WeatherSummary | null;
  weatherError: boolean;
  selectedCity: City | null;
  hasGps: boolean;
  routeHomeAddress: string | undefined;
  hourlyScrollRef: React.RefObject<ScrollView>;
  showCityPicker: boolean;
  onToggleCityPicker: () => void;
  onCitySelect: (city: City | null) => void;
}

export default function WeatherSection({
  weather,
  weatherError,
  selectedCity,
  hasGps,
  routeHomeAddress,
  hourlyScrollRef,
  showCityPicker,
  onToggleCityPicker,
  onCitySelect,
}: Props) {
  return (
    <>
      {weatherError && !weather && (
        <View style={styles.errorWrap}>
          <Ionicons name="cloud-offline-outline" size={14} color={colors.textMuted} />
          <Text style={styles.errorText}>날씨 정보를 불러오지 못했습니다.</Text>
        </View>
      )}
      {weather && (
        <View style={styles.wrap}>
          <View style={styles.topRow}>
            <View style={styles.left}>
              <Ionicons name={getWeatherIonicon(weather.icon) as any} size={36} color={colors.textPrimary} />
              <View style={styles.tempBlock}>
                <Text style={styles.currentTemp}>
                  {Math.round(weather.currentTemp)}°
                  <Text style={styles.highLow}>  최고 {Math.round(weather.highTemp)}° · 최저 {Math.round(weather.lowTemp)}°</Text>
                </Text>
                {(weather.currentPop ?? 0) > 0 && (
                  <View style={styles.popRow}>
                    <Ionicons name="umbrella-outline" size={11} color="#1976D2" />
                    <Text style={styles.popText}>강수 {weather.currentPop}%</Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity style={styles.locationBtn} onPress={onToggleCityPicker}>
              <Ionicons name="location-outline" size={12} color={colors.primary} />
              <Text style={styles.locationText}>
                {selectedCity ? selectedCity.name : hasGps ? '현재 위치' : routeHomeAddress?.split(' ').slice(0, 2).join(' ') ?? '서울'}
              </Text>
              <Ionicons name={showCityPicker ? 'chevron-up' : 'chevron-forward'} size={11} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {showCityPicker && (
            <View style={styles.cityPanel}>
              <Text style={styles.cityLabel}>날씨 지역 선택</Text>
              <View style={styles.cityGrid}>
                <TouchableOpacity
                  style={[styles.cityBtn, !selectedCity && styles.cityBtnActive]}
                  onPress={() => onCitySelect(null)}
                >
                  <Text style={[styles.cityBtnText, !selectedCity && styles.cityBtnTextActive]}>
                    {hasGps ? 'GPS' : '기본'}
                  </Text>
                </TouchableOpacity>
                {CITIES.map(city => (
                  <TouchableOpacity
                    key={city.name}
                    style={[styles.cityBtn, selectedCity?.name === city.name && styles.cityBtnActive]}
                    onPress={() => onCitySelect(city)}
                  >
                    <Text style={[styles.cityBtnText, selectedCity?.name === city.name && styles.cityBtnTextActive]}>
                      {city.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <ScrollView
            ref={hourlyScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hourlyRow}
          >
            {(() => {
              const nowHour = new Date().getHours();
              const currentIdx = weather.hourly.reduce((best, item, i) => {
                const h = parseInt(item.time.split(':')[0], 10);
                const bestH = parseInt(weather.hourly[best].time.split(':')[0], 10);
                return Math.abs(h - nowHour) < Math.abs(bestH - nowHour) ? i : best;
              }, 0);
              return weather.hourly.map((item, i) => {
                const isCurrent = i === currentIdx;
                return (
                  <View key={i} style={[styles.hourlyItem, isCurrent && styles.hourlyItemCurrent]}>
                    <Text style={[styles.hourlyTime, isCurrent && { color: colors.primary, fontFamily: fonts.semiBold }]}>
                      {isCurrent ? '지금' : item.time}
                    </Text>
                    <Ionicons
                      name={item.icon === 'sunny' ? 'sunny-outline' : item.icon === 'snowy' ? 'snow-outline' : item.icon === 'cloudy' ? 'cloudy-outline' : 'rainy-outline'}
                      size={16}
                      color={isCurrent ? colors.primary : colors.textSecondary}
                      style={{ marginVertical: 4 }}
                    />
                    <Text style={[styles.hourlyTemp, isCurrent && { color: colors.primary, fontFamily: fonts.bold }]}>
                      {Math.round(item.temperature)}°
                    </Text>
                    {(item.precipitationProb ?? 0) > 0 && (
                      <Text style={styles.hourlyPop}>{item.precipitationProb}%</Text>
                    )}
                  </View>
                );
              });
            })()}
          </ScrollView>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  errorWrap:        { flexDirection: 'row', alignItems: 'center', gap: 5, marginHorizontal: 20, marginBottom: 8 },
  errorText:        { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted },
  wrap:             { marginHorizontal: 20, marginBottom: 12, backgroundColor: colors.card, borderRadius: 16, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, ...cardShadow },
  topRow:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  left:             { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tempBlock:        { justifyContent: 'center' },
  currentTemp:      { fontSize: 30, fontFamily: fonts.extraBold, color: colors.textPrimary, lineHeight: 34 },
  highLow:          { fontSize: 11, fontFamily: fonts.regular, color: colors.textSecondary, fontStyle: 'italic' },
  popRow:           { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  popText:          { fontSize: 11, fontFamily: fonts.semiBold, color: '#1976D2' },
  locationBtn:      { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2, backgroundColor: colors.primaryLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16 },
  locationText:     { fontSize: 11, fontFamily: fonts.semiBold, color: colors.primary },
  cityPanel:        { backgroundColor: colors.primaryLight, borderRadius: 10, padding: 12, marginTop: 8 },
  cityLabel:        { fontSize: 11, fontFamily: fonts.semiBold, color: colors.primary, marginBottom: 8 },
  cityGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cityBtn:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.card },
  cityBtnActive:    { backgroundColor: colors.primary },
  cityBtnText:      { fontSize: 12, fontFamily: fonts.semiBold, color: colors.textSecondary },
  cityBtnTextActive:{ color: '#fff' },
  hourlyRow:        { gap: 4, paddingVertical: 2 },
  hourlyItem:       { alignItems: 'center', minWidth: 52, paddingHorizontal: 6 },
  hourlyItemCurrent:{ backgroundColor: colors.primaryLight, borderRadius: 10, paddingVertical: 4 },
  hourlyTime:       { fontSize: 10, color: colors.textSecondary, fontFamily: fonts.regular },
  hourlyTemp:       { fontSize: 12, fontFamily: fonts.bold, color: colors.textPrimary },
  hourlyPop:        { fontSize: 9, fontFamily: fonts.semiBold, color: '#1976D2' },
});
