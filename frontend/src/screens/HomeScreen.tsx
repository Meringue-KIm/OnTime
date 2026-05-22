import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { colors, fonts, cardShadow } from '../constants/colors';
import { getToday, type TodayResponse } from '../api/today';
import { getWeatherSummary, type WeatherSummary } from '../api/weather';
import { useRouteStore } from '../store/routeStore';
import { useAppointmentStore } from '../store/appointmentStore';
import { useNotification } from '../hooks/useNotification';
import { useLocation } from '../hooks/useLocation';
import { formatApptTime, extractTimeHHmm } from '../utils/timeFormat';
import { getWeatherNavIcon, getWeatherIonicon } from '../utils/weather';
import { DEFAULT_LOCATION } from '../constants/locations';

const logo = require('../../assets/logo.png');

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}


export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [todayLoading, setTodayLoading] = useState(true);
  const [weather, setWeather] = useState<WeatherSummary | null>(null);

  const { routes, fetchRoutes } = useRouteStore();
  const { appointments, fetchAppointments } = useAppointmentStore();
  const { coords: gpsCoords, status: locationStatus } = useLocation();

  useEffect(() => {
    fetchRoutes();
    fetchAppointments();
    getToday()
      .then(({ data }) => setToday(data))
      .catch(() => setToday(null))
      .finally(() => setTodayLoading(false));
  }, []);

  // 날씨 우선순위: GPS 위치 > 활성 경로 집 주소 > 서울 기본값
  useEffect(() => {
    const active = routes.find(r => r.isActive) ?? routes[0];
    const lat = gpsCoords?.lat ?? active?.homeLat ?? DEFAULT_LOCATION.lat;
    const lng = gpsCoords?.lng ?? active?.homeLng ?? DEFAULT_LOCATION.lng;
    getWeatherSummary(lat, lng)
      .then(({ data }) => setWeather(data))
      .catch(() => {});
  }, [gpsCoords, routes]);

  useNotification();

  const activeRoute = routes.find(r => r.isActive) ?? routes[0];
  const upcomingAppts = appointments
    .filter(a => !a.isDone && a.dDay >= 0)
    .sort((a, b) => new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime())
    .slice(0, 3);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Image source={logo} style={styles.logoImg} resizeMode="contain" />
      </View>

      {/* Greeting */}
      <View style={styles.greetingSection}>
        <Text style={styles.greeting}>오늘도 OnTime으로 여유있게 출발하세요. 👋</Text>
      </View>

      {/* Weather */}
      {weather && (
        <View style={styles.weatherWrap}>
          {/* 상단: 아이콘 + 기온 + 위치 */}
          <View style={styles.weatherTopRow}>
            <View style={styles.weatherLeft}>
              <Ionicons
                name={getWeatherIonicon(weather.icon) as any}
                size={36}
                color={colors.textPrimary}
              />
              <View style={styles.weatherTempBlock}>
                <Text style={styles.weatherCurrentTemp}>
                  {Math.round(weather.currentTemp)}°
                  <Text style={styles.weatherHighLow}>  최고 {Math.round(weather.highTemp)}° · 최저 {Math.round(weather.lowTemp)}°</Text>
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.weatherLocationBtn} onPress={() => navigation.navigate('Route')}>
              <Ionicons name="location-outline" size={12} color={colors.primary} />
              <Text style={styles.weatherLocation}>
                {gpsCoords
                  ? '현재 위치'
                  : activeRoute?.homeAddress?.split(' ').slice(0, 2).join(' ') ?? '서울'}
              </Text>
              <Ionicons name="chevron-forward" size={11} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* 하단: 시간대별 스크롤 */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourlyRow}>
            {weather.hourly.map((item, i) => (
              <View key={i} style={styles.hourlyItem}>
                <Text style={styles.hourlyTime}>{item.time}</Text>
                <Ionicons
                  name={item.icon === 'sunny' ? 'sunny-outline' : item.icon === 'snowy' ? 'snow-outline' : item.icon === 'cloudy' ? 'cloudy-outline' : 'rainy-outline'}
                  size={16}
                  color={colors.textSecondary}
                  style={{ marginVertical: 4 }}
                />
                <Text style={styles.hourlyTemp}>{Math.round(item.temperature)}°</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Departure Card */}
      <View style={styles.departureCard}>
        <Text style={styles.departureLabel}>다음 출발 시간</Text>
        {todayLoading ? (
          <ActivityIndicator color="#fff" size="large" style={{ marginVertical: 8 }} />
        ) : today?.recommendedDeparture ? (
          <>
            <Text style={styles.departureTime}>
              {extractTimeHHmm(today.recommendedDeparture)}
            </Text>
            <View style={styles.trafficRow}>
              <View style={styles.trafficBadge}>
                <Ionicons name="car" size={13} color="#fff" />
                <Text style={styles.trafficBadgeText}>
                  도착 목표: {today.arrivalTime?.substring(0, 5) ?? '--:--'}
                </Text>
              </View>
              {today.weather && (
                <View style={[styles.trafficBadge, { marginTop: 6 }]}>
                  <Ionicons name={getWeatherNavIcon(today.weather.icon)} size={13} color="#fff" />
                  <Text style={styles.trafficBadgeText}>
                    {today.weather.condition} {today.weather.temperature}°C
                    {today.weather.bufferMinutes > 0 ? `  +${today.weather.bufferMinutes}분` : ''}
                  </Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <Text style={styles.noRouteText}>
            {today?.message ?? '루트를 먼저 설정해주세요'}
          </Text>
        )}
      </View>

      {/* Route Preview */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardLabel}>경로 미리보기</Text>
          <TouchableOpacity style={styles.routeAddBtn} onPress={() => navigation.navigate('Route')}>
            <Ionicons name="add" size={14} color={colors.primary} />
            <Text style={styles.routeAddBtnText}>{activeRoute ? '수정' : '추가'}</Text>
          </TouchableOpacity>
        </View>
        {activeRoute ? (
          <>
            <View style={styles.routeRow}>
              <View style={styles.routePoints}>
                <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                <View style={styles.routeDash} />
                <View style={[styles.dot, { backgroundColor: colors.secondary }]} />
              </View>
              <View style={styles.routeTexts}>
                <Text style={styles.routeText}>{activeRoute.homeAddress}</Text>
                <Text style={[styles.routeText, { color: colors.textMuted, fontSize: 12, fontFamily: fonts.regular }]}>
                  {activeRoute.alarmBeforeMinutes}분 여유
                </Text>
                <Text style={styles.routeText}>{activeRoute.workAddress}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.navBtn}>
              <Ionicons name="navigate" size={16} color="#fff" />
              <Text style={styles.navBtnText}>내비게이션 시작</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.noRouteBtn} onPress={() => navigation.navigate('Route')}>
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.noRouteBtnText}>루트를 설정해주세요</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Schedule */}
      <View style={[styles.card, { marginBottom: 28 }]}>
        <Text style={styles.cardLabel}>다가오는 약속</Text>
        {upcomingAppts.length === 0 ? (
          <Text style={styles.emptyText}>예정된 약속이 없습니다.</Text>
        ) : (
          upcomingAppts.map((item) => (
            <View key={item.id} style={styles.scheduleItem}>
              <View style={styles.scheduleIconWrap}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.scheduleTitle}>{item.destAddress}</Text>
                <Text style={styles.scheduleLocation}>
                  {item.dDay === 0 ? 'D-Day' : `D-${item.dDay}`}
                </Text>
              </View>
              <Text style={styles.scheduleTime}>{formatApptTime(item.appointmentTime)}</Text>
            </View>
          ))
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>날씨 제공: 기상청 · 지도: 카카오맵</Text>
        <Text style={styles.footerText}>© 2026 OnTime. All rights reserved.</Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.bg },
  header:           { paddingHorizontal: 20, paddingBottom: 4 },
  logoImg:          { width: 180, height: 81 },
  greetingSection:  { paddingHorizontal: 20, paddingBottom: 12 },
  greeting:         { fontSize: 16, fontFamily: fonts.semiBold, color: colors.textSecondary },
  weatherWrap:        { marginHorizontal: 20, marginBottom: 12, backgroundColor: colors.card, borderRadius: 16, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, ...cardShadow },
  weatherTopRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  weatherLeft:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weatherTempBlock:   { justifyContent: 'center' },
  weatherCurrentTemp: { fontSize: 30, fontFamily: fonts.extraBold, color: colors.textPrimary, lineHeight: 34 },
  weatherHighLow:     { fontSize: 11, fontFamily: fonts.regular, color: colors.textSecondary, fontStyle: 'italic' },
  weatherLocationBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  weatherLocation:    { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted, fontStyle: 'italic' },
  hourlyRow:          { gap: 4, paddingVertical: 2 },
  hourlyItem:         { alignItems: 'center', minWidth: 52, paddingHorizontal: 6 },
  hourlyTime:         { fontSize: 10, color: colors.textSecondary, fontFamily: fonts.regular },
  hourlyTemp:         { fontSize: 12, fontFamily: fonts.bold, color: colors.textPrimary },
  departureCard:    { marginHorizontal: 20, borderRadius: 20, backgroundColor: colors.primary, padding: 20, marginBottom: 16 },
  departureLabel:   { fontSize: 13, fontFamily: fonts.regular, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  departureTime:    { fontSize: 44, fontFamily: fonts.extraBold, color: '#fff', letterSpacing: -1 },
  noRouteText:      { fontSize: 16, fontFamily: fonts.regular, color: 'rgba(255,255,255,0.8)', marginVertical: 12 },
  trafficRow:       { marginTop: 8 },
  trafficBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  trafficBadgeText: { color: '#fff', fontSize: 12, fontFamily: fonts.regular },
  card:             { marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, ...cardShadow },
  cardLabel:        { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textSecondary, marginBottom: 10 },
  rowBetween:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  routeAddBtn:      { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  routeAddBtnText:  { fontSize: 12, fontFamily: fonts.semiBold, color: colors.primary },
  noRouteBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  noRouteBtnText:   { fontSize: 14, fontFamily: fonts.semiBold, color: colors.primary },
  routeRow:         { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  routePoints:      { alignItems: 'center', gap: 4 },
  dot:              { width: 10, height: 10, borderRadius: 5 },
  routeDash:        { width: 2, height: 24, backgroundColor: colors.border },
  routeTexts:       { gap: 10, flex: 1 },
  routeText:        { fontSize: 14, fontFamily: fonts.semiBold, color: colors.textPrimary },
  navBtn:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: 50, paddingVertical: 12 },
  navBtnText:       { color: '#fff', fontFamily: fonts.semiBold, fontSize: 14 },
  emptyText:        { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center', paddingVertical: 12 },
  scheduleItem:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  scheduleIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  scheduleTitle:    { fontSize: 14, fontFamily: fonts.semiBold, color: colors.textPrimary },
  scheduleLocation: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 2 },
  scheduleTime:     { fontSize: 12, fontFamily: fonts.semiBold, color: colors.textSecondary },
  footer:           { alignItems: 'center', paddingVertical: 20, gap: 4, marginTop: 8 },
  footerText:       { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted },
});
