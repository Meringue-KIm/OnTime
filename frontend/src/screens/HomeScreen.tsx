import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Platform, Alert, Linking, AppState, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { colors, fonts, cardShadow } from '../constants/colors';
import { getWeatherSummary, type WeatherSummary } from '../api/weather';
import { useRouteStore } from '../store/routeStore';
import { useAppointmentStore } from '../store/appointmentStore';
import { useTodayStore } from '../store/todayStore';
import { useNotification } from '../hooks/useNotification';
import { useLocation } from '../hooks/useLocation';
import { formatApptTime, extractTimeHHmm, formatKoreanDateTime } from '../utils/timeFormat';
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
  const { today, loading: todayLoading, error: todayError, cachedAt, fetchToday } = useTodayStore();
  const [weather, setWeather] = useState<WeatherSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [weatherError, setWeatherError] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [showWeatherInfo, setShowWeatherInfo] = useState(false);

  const { routes, fetchRoutes } = useRouteStore();
  const { appointments, fetchAppointments } = useAppointmentStore();
  const { coords: gpsCoords, status: locationStatus } = useLocation();
  const lastRefreshRef = useRef<number>(0);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchRoutes(), fetchAppointments(), fetchToday()]);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchRoutes();
    fetchAppointments();
    fetchToday();
  }, []);

  // 로드 실패 시 5초 후 자동 재시도 (서버 콜드스타트 대응)
  useEffect(() => {
    if (!todayError) return;
    const timer = setTimeout(fetchToday, 5000);
    return () => clearTimeout(timer);
  }, [todayError]);

  // 앱 백그라운드 → 포그라운드 복귀 시 데이터 갱신 (5분 쿨다운)
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        const now = Date.now();
        if (now - lastRefreshRef.current < 5 * 60 * 1000) return;
        lastRefreshRef.current = now;
        fetchRoutes();
        fetchAppointments();
        fetchToday();
      }
    });
    return () => sub.remove();
  }, []);

  const handleNavigation = async (destLat?: number, destLng?: number, destAddress?: string) => {
    const route = routes.find(r => r.isActive) ?? routes[0];
    const transportMode = route?.transportMode ?? 'car';

    // 목적지 결정: 인자로 받은 좌표 > 오늘 약속 장소 > 회사
    let lat: number | undefined = destLat;
    let lng: number | undefined = destLng;
    let address: string = destAddress ?? '';

    if (!lat || !lng) {
      // 오늘 D-Day=0이고 아직 지나지 않은 약속 중 가장 이른 것
      const now = new Date();
      const todayAppt = appointments
        .filter(a => !a.isDone && a.dDay === 0 && a.destLat && a.destLng)
        .filter(a => new Date(a.appointmentTime) > now)
        .sort((a, b) => new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime())[0];

      if (todayAppt?.destLat && todayAppt?.destLng) {
        lat = todayAppt.destLat;
        lng = todayAppt.destLng;
        address = todayAppt.destAddress;
      } else {
        if (!route?.workLat || !route?.workLng) {
          Alert.alert('위치 정보 없음', '루트의 직장 주소를 검색 목록에서 다시 선택해주세요.');
          return;
        }
        lat = route.workLat;
        lng = route.workLng;
        address = route.workAddress;
      }
    }

    const name = encodeURIComponent(address);
    const kakaoMode  = transportMode === 'transit' ? 'PUBLICTRANSIT' : transportMode === 'walk' ? 'FOOT' : 'CAR';
    const naverPath  = transportMode === 'transit' ? 'public' : transportMode === 'walk' ? 'walk' : 'car';
    const googleMode = transportMode === 'transit' ? 'transit' : transportMode === 'walk' ? 'walking' : 'driving';

    const kakaoUrl  = `kakaomap://route?ep=${lat},${lng}&by=${kakaoMode}`;
    const naverUrl  = `nmap://route/${naverPath}?dlat=${lat}&dlng=${lng}&dname=${name}&appname=app.ontime`;
    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=${googleMode}`;

    const tryOpen = async (url: string) => {
      const can = await Linking.canOpenURL(url).catch(() => false);
      if (can) { Linking.openURL(url); return true; }
      return false;
    };

    if (await tryOpen(kakaoUrl)) return;
    if (await tryOpen(naverUrl)) return;
    Linking.openURL(googleUrl);
  };

  const activeRoute = routes.find(r => r.isActive) ?? routes[0];

  // 날씨 우선순위: GPS 위치 > 활성 경로 집 주소 > 서울 기본값
  // deps에 원시값만 사용 — routes 배열 참조가 바뀔 때마다 재실행되는 것을 방지
  useEffect(() => {
    const lat = gpsCoords?.lat ?? activeRoute?.homeLat ?? DEFAULT_LOCATION.lat;
    const lng = gpsCoords?.lng ?? activeRoute?.homeLng ?? DEFAULT_LOCATION.lng;
    setWeatherError(false);
    getWeatherSummary(lat, lng)
      .then(({ data }) => { setWeather(data); setWeatherError(false); })
      .catch(() => setWeatherError(true));
  }, [gpsCoords?.lat, gpsCoords?.lng, activeRoute?.homeLat, activeRoute?.homeLng]);

  const { alarmFired, dismissAlarmBanner } = useNotification();

  // 출발 배너: 알람 탭 응답 OR 출발 시간이 지난 후 1시간 이내 (dismiss 안 한 경우)
  const timeBasedBanner = !bannerDismissed && !today?.logDate && (() => {
    if (!today?.recommendedDeparture) return false;
    const [hh, mm] = today.recommendedDeparture.split(':').map(Number);
    const dep = new Date(); dep.setHours(hh, mm, 0, 0);
    const diff = Date.now() - dep.getTime();
    return diff > 0 && diff < 60 * 60 * 1000;
  })();
  const showDepartureBanner = alarmFired || timeBasedBanner;
  const handleDismissBanner = () => { dismissAlarmBanner(); setBannerDismissed(true); };

  const cacheAgeLabel = (() => {
    if (!cachedAt) return '';
    const diffMin = Math.round((Date.now() - new Date(cachedAt).getTime()) / 60000);
    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    return `${Math.floor(diffMin / 60)}시간 전`;
  })();

  const departureLabel = (() => {
    if (!today?.recommendedDeparture) return '다음 출발 시간';
    const [hh, mm] = today.recommendedDeparture.split(':').map(Number);
    const dep = new Date(); dep.setHours(hh, mm, 0, 0);
    if (dep > new Date()) return '오늘 출발 시간';
    return today.logDate ? '오늘 출발 완료' : '오늘 출발 기준 시간';
  })();

  const greeting = (() => {
    if (today?.recommendedDeparture) {
      const [hh, mm] = today.recommendedDeparture.split(':').map(Number);
      const dep = new Date(); dep.setHours(hh, mm, 0, 0);
      const diffMin = (dep.getTime() - Date.now()) / 60000;
      if (diffMin > 0 && diffMin <= 30) return '곧 출발 시간이에요! 준비되셨나요? 🚀';
      if (diffMin > 0 && diffMin <= 60) return `${Math.round(diffMin)}분 후 출발입니다. 여유 있게 준비하세요.`;
    }
    const h = new Date().getHours();
    if (h < 6)  return '오늘도 OnTime과 함께하세요! ✨';
    if (h < 10) return '좋은 아침이에요! 오늘도 정시 출발 🌅';
    if (h < 14) return '좋은 오전이에요. 오늘 하루도 OnTime으로! ☀️';
    if (h < 18) return '오후도 힘차게! 내일 알람도 준비됐어요. 💪';
    if (h < 22) return '수고하셨어요! 내일 출발 시간을 계산 중이에요. 🌆';
    return '오늘도 수고 많으셨어요! OnTime이 내일도 함께할게요. 🌙';
  })();

  const upcomingAppts = appointments
    .filter(a => !a.isDone && a.dDay >= 0)
    .sort((a, b) => new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime())
    .slice(0, 3);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
    >

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Image source={logo} style={styles.logoImg} resizeMode="contain" />
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsBtn}>
          <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* 출발 배너 — 알람 탭 후 or 출발 시간 경과 시 자동 표시 */}
      {showDepartureBanner && (
        <View style={styles.departureBanner}>
          <View style={styles.departureBannerTop}>
            <Text style={styles.departureBannerTitle}>지금 출발할 시간이에요! 🚀</Text>
            <TouchableOpacity onPress={handleDismissBanner} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>
          <Text style={styles.departureBannerSub}>안전 운행하세요. 오늘도 OnTime!</Text>
          <TouchableOpacity style={styles.departureBannerBtn} onPress={() => handleNavigation()}>
            <Ionicons name="navigate" size={16} color="#fff" />
            <Text style={styles.departureBannerBtnText}>내비게이션 시작</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Greeting */}
      <View style={styles.greetingSection}>
        <Text style={styles.greeting}>{greeting}</Text>
      </View>

      {/* Weather */}
      {weatherError && !weather && (
        <View style={styles.weatherErrorWrap}>
          <Ionicons name="cloud-offline-outline" size={14} color={colors.textMuted} />
          <Text style={styles.weatherErrorText}>날씨 정보를 불러오지 못했습니다.</Text>
        </View>
      )}
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
                {(weather.currentPop ?? 0) > 0 && (
                  <View style={styles.weatherPopRow}>
                    <Ionicons name="umbrella-outline" size={11} color="#1976D2" />
                    <Text style={styles.weatherPopText}>강수 {weather.currentPop}%</Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={styles.weatherLocationBtn}
              onPress={() => setShowWeatherInfo(v => !v)}
            >
              <Ionicons name="location-outline" size={12} color={colors.primary} />
              <Text style={styles.weatherLocation}>
                {gpsCoords
                  ? '현재 위치'
                  : activeRoute?.homeAddress?.split(' ').slice(0, 2).join(' ') ?? '서울'}
              </Text>
              <Ionicons name={showWeatherInfo ? 'chevron-up' : 'chevron-forward'} size={11} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          {showWeatherInfo && (
            <View style={styles.weatherInfoPanel}>
              <Text style={styles.weatherInfoText}>
                {gpsCoords ? 'GPS 현재 위치' : (activeRoute?.homeAddress?.split(' ').slice(0, 2).join(' ') ?? '서울 기본값')} 기준 날씨입니다.{'\n'}위치를 변경하려면 루트 탭에서 집 주소를 수정하세요.
              </Text>
              <TouchableOpacity onPress={() => { setShowWeatherInfo(false); navigation.navigate('Route'); }}>
                <Text style={styles.weatherInfoLink}>루트 수정 →</Text>
              </TouchableOpacity>
            </View>
          )}

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
                {(item.precipitationProb ?? 0) > 0 && (
                  <Text style={styles.hourlyPop}>{item.precipitationProb}%</Text>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Departure Card */}
      <View style={styles.departureCard}>
        <Text style={styles.departureLabel}>{departureLabel}</Text>
        {activeRoute && today?.recommendedDeparture && (
          <Text style={styles.routeHint}>
            {activeRoute.homeAddress.split(' ').slice(0, 2).join(' ')} → {activeRoute.workAddress.split(' ').slice(0, 2).join(' ')}
          </Text>
        )}
        {todayLoading ? (
          <ActivityIndicator color="#fff" size="large" style={{ marginVertical: 8 }} />
        ) : todayError && !today?.recommendedDeparture ? (
          <View style={styles.onboardingWrap}>
            <Ionicons name="cloud-offline-outline" size={28} color="rgba(255,255,255,0.7)" />
            <Text style={styles.noRouteSubText}>잠시 후 자동으로 다시 시도합니다...</Text>
          </View>
        ) : today?.recommendedDeparture ? (
          <>
            <Text style={styles.departureTime}>
              {extractTimeHHmm(today.recommendedDeparture)}
            </Text>
            {todayError && cachedAt && (
              <View style={styles.offlineBadge}>
                <Ionicons name="cloud-offline-outline" size={11} color="rgba(255,255,255,0.7)" />
                <Text style={styles.offlineBadgeText}>오프라인 · {cacheAgeLabel}</Text>
              </View>
            )}
            {today.drivingMinutes !== undefined && (
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownChip}>
                  <Ionicons name="car-outline" size={11} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.breakdownChipText}>이동 {today.drivingMinutes}분</Text>
                </View>
                {(today.weather?.bufferMinutes ?? 0) > 0 && (
                  <>
                    <Text style={styles.breakdownPlus}>+</Text>
                    <View style={styles.breakdownChip}>
                      <Ionicons name={getWeatherNavIcon(today.weather!.icon)} size={11} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.breakdownChipText}>날씨 +{today.weather!.bufferMinutes}분</Text>
                    </View>
                  </>
                )}
                {(activeRoute?.alarmBeforeMinutes ?? 0) > 0 && (
                  <>
                    <Text style={styles.breakdownPlus}>+</Text>
                    <View style={styles.breakdownChip}>
                      <Ionicons name="alarm-outline" size={11} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.breakdownChipText}>여유 {activeRoute!.alarmBeforeMinutes}분</Text>
                    </View>
                  </>
                )}
              </View>
            )}
            <View style={styles.trafficRow}>
              {today.logDate ? (
                <View style={[styles.trafficBadge, { backgroundColor: 'rgba(255,255,255,0.35)', marginBottom: 4 }]}>
                  <Ionicons name="checkmark-circle" size={13} color="#fff" />
                  <Text style={styles.trafficBadgeText}>오늘 알람 발송 완료</Text>
                </View>
              ) : (() => {
                // 오늘이 활성 요일이고 출발 시간이 아직 미래면 "예약됨" 표시
                const [hh, mm] = today.recommendedDeparture!.split(':').map(Number);
                const dep = new Date(); dep.setHours(hh, mm, 0, 0);
                const todayDow = new Date().getDay();
                const isActiveToday = activeRoute?.activeDays
                  ?.split(',').map(Number).includes(todayDow) ?? false;
                if (dep > new Date() && isActiveToday) {
                  return (
                    <View style={[styles.trafficBadge, { backgroundColor: 'rgba(255,255,255,0.25)', marginBottom: 4 }]}>
                      <Ionicons name="alarm-outline" size={13} color="#fff" />
                      <Text style={styles.trafficBadgeText}>오늘 알람 예약됨</Text>
                    </View>
                  );
                }
                return null;
              })()}
              <View style={styles.trafficBadge}>
                <Ionicons name="flag-outline" size={13} color="#fff" />
                <Text style={styles.trafficBadgeText}>
                  도착 목표: {today.arrivalTime?.substring(0, 5) ?? '--:--'}
                </Text>
              </View>
              {today.weather && (
                <View style={[styles.trafficBadge, { marginTop: 6 }]}>
                  <Ionicons name={getWeatherNavIcon(today.weather.icon)} size={13} color="#fff" />
                  <Text style={styles.trafficBadgeText}>
                    {today.weather.condition} {today.weather.temperature}°C
                    {today.weather.bufferMinutes > 0 ? ` · 날씨로 +${today.weather.bufferMinutes}분 추가` : ''}
                  </Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <View style={styles.onboardingWrap}>
            <Ionicons name="map-outline" size={32} color="rgba(255,255,255,0.7)" />
            <Text style={styles.noRouteText}>아직 루트가 없어요</Text>
            <Text style={styles.noRouteSubText}>집·직장 주소를 등록하면 매일 맞춤 출발 알람을 받을 수 있어요.</Text>
            <TouchableOpacity style={styles.onboardingBtn} onPress={() => navigation.navigate('Route')}>
              <Text style={styles.onboardingBtnText}>루트 설정하러 가기 →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 내비게이션 */}
      {activeRoute && (
        <TouchableOpacity style={[styles.navBtn, { marginHorizontal: 20, marginBottom: 12 }]} onPress={handleNavigation}>
          <Ionicons name="navigate" size={16} color="#fff" />
          <Text style={styles.navBtnText}>내비게이션 시작</Text>
        </TouchableOpacity>
      )}
      {!activeRoute && (
        <View style={[styles.card, { marginBottom: 12 }]}>
          <TouchableOpacity style={styles.noRouteBtn} onPress={() => navigation.navigate('Route')}>
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.noRouteBtnText}>루트를 설정해주세요</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Schedule */}
      <View style={[styles.card, { marginBottom: 28 }]}>
        <Text style={styles.cardLabel}>다가오는 약속</Text>
        {upcomingAppts.length === 0 ? (
          <View style={styles.emptyApptWrap}>
            <Text style={styles.emptyText}>예정된 약속이 없습니다.</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Appointment')}>
              <Text style={styles.emptyApptLink}>약속 추가하기 →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          upcomingAppts.map((item) => (
            <View key={item.id} style={styles.scheduleItem}>
              <View style={styles.scheduleIconWrap}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.scheduleTitle}>{item.title || item.destAddress}</Text>
                <Text style={styles.scheduleLocation} numberOfLines={1}>
                  {item.title ? `${item.destAddress} · ` : ''}{item.dDay === 0 ? 'D-Day' : `D-${item.dDay}`}
                </Text>
              </View>
              <Text style={styles.scheduleTime}>
                {item.dDay === 0 ? formatApptTime(item.appointmentTime) : formatKoreanDateTime(item.appointmentTime)}
              </Text>
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
  container:          { flex: 1, backgroundColor: colors.bg },
  departureBanner:    { marginHorizontal: 20, marginBottom: 12, backgroundColor: '#1B5E20', borderRadius: 16, padding: 18, gap: 8 },
  departureBannerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  departureBannerTitle:{ fontSize: 18, fontFamily: fonts.bold, color: '#fff' },
  departureBannerSub: { fontSize: 13, fontFamily: fonts.regular, color: 'rgba(255,255,255,0.75)' },
  departureBannerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingVertical: 11, marginTop: 4 },
  departureBannerBtnText: { color: '#fff', fontFamily: fonts.semiBold, fontSize: 14 },
  header:           { paddingHorizontal: 20, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoImg:          { width: 180, height: 81 },
  settingsBtn:      { padding: 6 },
  greetingSection:  { paddingHorizontal: 20, paddingBottom: 12 },
  greeting:         { fontSize: 16, fontFamily: fonts.semiBold, color: colors.textSecondary },
  weatherErrorWrap:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginHorizontal: 20, marginBottom: 8 },
  weatherErrorText:   { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted },
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
  onboardingWrap:   { alignItems: 'center', gap: 8, paddingVertical: 8 },
  noRouteText:      { fontSize: 18, fontFamily: fonts.bold, color: '#fff' },
  noRouteSubText:   { fontSize: 13, fontFamily: fonts.regular, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  onboardingBtn:    { marginTop: 4, backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  onboardingBtnText:{ fontSize: 14, fontFamily: fonts.semiBold, color: '#fff' },
  breakdownRow:     { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 8, marginBottom: 2 },
  breakdownChip:    { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  breakdownChipText:{ fontSize: 11, fontFamily: fonts.regular, color: 'rgba(255,255,255,0.9)' },
  breakdownPlus:    { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: fonts.regular },
  routeHint:        { fontSize: 11, fontFamily: fonts.regular, color: 'rgba(255,255,255,0.6)', marginBottom: 6 },
  weatherPopRow:    { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  weatherPopText:   { fontSize: 11, fontFamily: fonts.semiBold, color: '#1976D2' },
  hourlyPop:        { fontSize: 9, fontFamily: fonts.semiBold, color: '#1976D2' },
  offlineBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.2)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginTop: 6 },
  offlineBadgeText: { fontSize: 11, fontFamily: fonts.regular, color: 'rgba(255,255,255,0.7)' },
  trafficRow:       { marginTop: 8 },
  trafficBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  trafficBadgeText: { color: '#fff', fontSize: 12, fontFamily: fonts.regular },
  card:             { marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, ...cardShadow },
  cardLabel:        { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textSecondary, marginBottom: 10 },
  rowBetween:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  routeAddBtn:        { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  routeAddBtnText:    { fontSize: 12, fontFamily: fonts.semiBold, color: colors.primary },
  noRouteBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  noRouteBtnText:     { fontSize: 14, fontFamily: fonts.semiBold, color: colors.primary },
  navBtn:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: 50, paddingVertical: 12 },
  navBtnText:         { color: '#fff', fontFamily: fonts.semiBold, fontSize: 14 },
  emptyText:        { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center', paddingVertical: 4 },
  emptyApptWrap:    { alignItems: 'center', paddingVertical: 8 },
  emptyApptLink:    { fontSize: 13, fontFamily: fonts.semiBold, color: colors.primary, marginTop: 6 },
  scheduleItem:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  scheduleIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  scheduleTitle:    { fontSize: 14, fontFamily: fonts.semiBold, color: colors.textPrimary },
  scheduleLocation: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 2 },
  scheduleTime:     { fontSize: 12, fontFamily: fonts.semiBold, color: colors.textSecondary },
  footer:           { alignItems: 'center', paddingVertical: 20, gap: 4, marginTop: 8 },
  footerText:       { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted },
  weatherInfoPanel: { backgroundColor: colors.primaryLight, borderRadius: 10, padding: 12, marginTop: 8, gap: 6 },
  weatherInfoText:  { fontSize: 12, fontFamily: fonts.regular, color: colors.textSecondary, lineHeight: 18 },
  weatherInfoLink:  { fontSize: 12, fontFamily: fonts.semiBold, color: colors.primary },
});
