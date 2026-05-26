import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Platform, Alert, Linking, AppState, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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
import { getWeatherRecommendations } from '../utils/weatherAssistant';
import { DEFAULT_LOCATION } from '../constants/locations';

const logo = require('../../assets/logo.png');

type City = { name: string; lat: number; lng: number };
const CITIES: City[] = [
  { name: '서울',   lat: 37.5665, lng: 126.9780 },
  { name: '인천',   lat: 37.4563, lng: 126.7052 },
  { name: '수원',   lat: 37.2636, lng: 127.0286 },
  { name: '성남',   lat: 37.4449, lng: 127.1388 },
  { name: '부산',   lat: 35.1796, lng: 129.0756 },
  { name: '대구',   lat: 35.8714, lng: 128.6014 },
  { name: '대전',   lat: 36.3504, lng: 127.3845 },
  { name: '광주',   lat: 35.1595, lng: 126.8526 },
  { name: '울산',   lat: 35.5384, lng: 129.3114 },
  { name: '제주',   lat: 33.4996, lng: 126.5312 },
];

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
  const BANNER_KEY = 'departure_banner_dismissed_date';
  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    AsyncStorage.getItem(BANNER_KEY).then(v => {
      if (v === todayStr) setBannerDismissed(true);
    });
  }, []);
  const [showWeatherInfo, setShowWeatherInfo] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [weatherRefreshToken, setWeatherRefreshToken] = useState(0);

  const { routes, fetchRoutes } = useRouteStore();
  const { appointments, fetchAppointments } = useAppointmentStore();
  const { coords: gpsCoords, status: locationStatus } = useLocation();
  const lastRefreshRef = useRef<number>(0);

  const onRefresh = async () => {
    setRefreshing(true);
    setWeatherRefreshToken(t => t + 1);
    await Promise.all([fetchRoutes(), fetchAppointments(), fetchToday()]);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchRoutes();
    fetchAppointments();
    fetchToday();
  }, []);

  // 탭 재진입 시 today 갱신 (알람 탭에서 버퍼 변경 후 홈 탭으로 전환 시 즉시 반영)
  useFocusEffect(
    React.useCallback(() => {
      const now = Date.now();
      if (now - lastRefreshRef.current > 30_000) {
        lastRefreshRef.current = now;
        fetchToday();
      }
    }, [])
  );

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
  const todayDow = new Date().getDay();
  const isActiveToday = activeRoute?.activeDays?.split(',').map(Number).includes(todayDow) ?? false;

  // 저장된 도시 선택 복원
  useEffect(() => {
    AsyncStorage.getItem('weather_city').then(v => {
      if (v) { try { setSelectedCity(JSON.parse(v)); } catch {} }
    });
  }, []);

  // 날씨 우선순위: 선택 도시 > GPS 위치 > 활성 경로 집 주소 > 서울 기본값
  useEffect(() => {
    const lat = selectedCity?.lat ?? gpsCoords?.lat ?? activeRoute?.homeLat ?? DEFAULT_LOCATION.lat;
    const lng = selectedCity?.lng ?? gpsCoords?.lng ?? activeRoute?.homeLng ?? DEFAULT_LOCATION.lng;
    setWeatherError(false);
    getWeatherSummary(lat, lng)
      .then(({ data }) => { setWeather(data); setWeatherError(false); })
      .catch(() => setWeatherError(true));
  }, [selectedCity, gpsCoords?.lat, gpsCoords?.lng, activeRoute?.homeLat, activeRoute?.homeLng, weatherRefreshToken]);

  const handleSelectCity = (city: City | null) => {
    setSelectedCity(city);
    setShowWeatherInfo(false);
    if (city) {
      AsyncStorage.setItem('weather_city', JSON.stringify(city)).catch(() => {});
    } else {
      AsyncStorage.removeItem('weather_city').catch(() => {});
    }
  };

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

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
  const handleDismissBanner = () => {
    dismissAlarmBanner();
    setBannerDismissed(true);
    AsyncStorage.setItem(BANNER_KEY, todayStr).catch(() => {});
  };

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
    if (!isActiveToday && !today.logDate) return '참고용 출발 시간 (오늘 알람 없음)';
    if (dep > new Date()) return '오늘 출발 시간';
    return today.logDate ? '오늘 출발 완료' : '오늘 출발 기준 시간';
  })();

  const departureCountdown = (() => {
    if (!today?.recommendedDeparture || today.logDate) return null;
    const [hh, mm] = today.recommendedDeparture.split(':').map(Number);
    const dep = new Date(); dep.setHours(hh, mm, 0, 0);
    const diffMin = Math.round((dep.getTime() - Date.now()) / 60000);
    if (diffMin > 0 && diffMin <= 180) return `${diffMin}분 후 출발`;
    if (diffMin <= 0 && diffMin >= -60) return `${Math.abs(diffMin)}분 경과`;
    return null;
  })();

  const greeting = (() => {
    if (today?.recommendedDeparture && isActiveToday) {
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

  const now = new Date(tick >= 0 ? Date.now() : 0); // tick 참조로 매분 재평가
  const todayAppts = appointments
    .filter(a => !a.isDone && a.dDay === 0 && new Date(a.appointmentTime) > now)
    .sort((a, b) => new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime());

  const nextAppt = appointments
    .filter(a => !a.isDone && a.dDay > 0)
    .sort((a, b) => new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime())[0];

  const upcomingCount = appointments.filter(a => !a.isDone && (
    (a.dDay === 0 && new Date(a.appointmentTime) > new Date()) || a.dDay > 0
  )).length;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      onScrollBeginDrag={() => setShowWeatherInfo(false)}
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

      {/* Departure Card — 핵심 정보 최우선 */}
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
            <Text style={styles.noRouteSubText}>서버에 연결할 수 없습니다.{'\n'}당겨서 새로고침하거나 잠시 후 자동으로 재시도합니다.</Text>
          </View>
        ) : today?.recommendedDeparture ? (
          <>
            <Text style={styles.departureTime}>
              {extractTimeHHmm(today.recommendedDeparture)}
            </Text>
            {departureCountdown && (
              <Text style={styles.departureCountdown}>{departureCountdown}</Text>
            )}
            {todayError && cachedAt && (
              <View style={styles.offlineBadge}>
                <Ionicons name="cloud-offline-outline" size={11} color="rgba(255,255,255,0.7)" />
                <Text style={styles.offlineBadgeText}>오프라인 · {cacheAgeLabel}</Text>
              </View>
            )}
            {today.drivingMinutes !== undefined && (
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownChip}>
                  <Ionicons
                    name={activeRoute?.transportMode === 'transit' ? 'bus-outline' : activeRoute?.transportMode === 'walk' ? 'walk-outline' : 'car-outline'}
                    size={11} color="rgba(255,255,255,0.9)"
                  />
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
                {(today.personalBuffer ?? 0) !== 0 && (
                  <>
                    <Text style={styles.breakdownPlus}>+</Text>
                    <View style={styles.breakdownChip}>
                      <Ionicons name="analytics-outline" size={11} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.breakdownChipText}>
                        패턴 {(today.personalBuffer ?? 0) > 0 ? '+' : ''}{today.personalBuffer}분
                      </Text>
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
                if (dep > new Date() && isActiveToday && !activeRoute?.isSkippedToday) {
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
        ) : activeRoute?.isSkippedToday ? (
          <View style={styles.onboardingWrap}>
            <Ionicons name="moon-outline" size={28} color="rgba(255,255,255,0.7)" />
            <Text style={styles.noRouteSubText}>오늘 알람 건너뛰기가 설정됐어요.{'\n'}내일부터 자동으로 다시 울려요.</Text>
          </View>
        ) : activeRoute ? (
          <View style={styles.onboardingWrap}>
            <Ionicons name="calendar-outline" size={28} color="rgba(255,255,255,0.7)" />
            <Text style={styles.noRouteSubText}>오늘은 알람이 없는 날이에요.{'\n'}반복 요일에 오늘이 포함됐는지 확인해보세요.</Text>
            <TouchableOpacity style={styles.onboardingBtn} onPress={() => navigation.navigate('Alarm')}>
              <Text style={styles.onboardingBtnText}>알람 설정 확인하기 →</Text>
            </TouchableOpacity>
          </View>
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

      {/* 내비게이션 — 출발 배너가 이미 내비 버튼을 포함하므로 배너 없을 때만 표시 / 비활성 요일엔 오늘 약속이 있을 때만 표시 */}
      {activeRoute && !showDepartureBanner && (isActiveToday || todayAppts.length > 0) && (
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

      {/* Weather */}
      {weatherError && !weather && (
        <View style={styles.weatherErrorWrap}>
          <Ionicons name="cloud-offline-outline" size={14} color={colors.textMuted} />
          <Text style={styles.weatherErrorText}>날씨 정보를 불러오지 못했습니다.</Text>
        </View>
      )}
      {weather && (
        <View style={styles.weatherWrap}>
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
                {selectedCity
                  ? selectedCity.name
                  : gpsCoords
                  ? '현재 위치'
                  : activeRoute?.homeAddress?.split(' ').slice(0, 2).join(' ') ?? '서울'}
              </Text>
              <Ionicons name={showWeatherInfo ? 'chevron-up' : 'chevron-forward'} size={11} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          {showWeatherInfo && (
            <View style={styles.weatherInfoPanel}>
              <Text style={styles.weatherInfoLabel}>날씨 지역 선택</Text>
              <View style={styles.cityGrid}>
                <TouchableOpacity
                  style={[styles.cityBtn, !selectedCity && styles.cityBtnActive]}
                  onPress={() => handleSelectCity(null)}
                >
                  <Text style={[styles.cityBtnText, !selectedCity && styles.cityBtnTextActive]}>
                    {gpsCoords ? 'GPS' : '기본'}
                  </Text>
                </TouchableOpacity>
                {CITIES.map(city => (
                  <TouchableOpacity
                    key={city.name}
                    style={[styles.cityBtn, selectedCity?.name === city.name && styles.cityBtnActive]}
                    onPress={() => handleSelectCity(city)}
                  >
                    <Text style={[styles.cityBtnText, selectedCity?.name === city.name && styles.cityBtnTextActive]}>
                      {city.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
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

      {/* 오늘 준비물 */}
      {weather && (() => {
        const rec = getWeatherRecommendations(weather);
        return (
          <View style={styles.assistantCard}>
            <Text style={styles.assistantTitle}>오늘 준비물</Text>
            <View style={styles.assistantRow}>
              <View style={styles.assistantItem}>
                <Ionicons name="shirt-outline" size={18} color={colors.primary} />
                <Text style={styles.assistantLabel}>{rec.outfit}</Text>
              </View>
              {rec.umbrella && (
                <View style={styles.assistantItem}>
                  <Ionicons name="umbrella-outline" size={18} color={rec.umbrella.urgent ? '#D32F2F' : '#1976D2'} />
                  <Text style={[styles.assistantLabel, { color: rec.umbrella.urgent ? '#D32F2F' : '#1976D2' }]}>
                    {rec.umbrella.label}
                  </Text>
                </View>
              )}
              {rec.tempGap && (
                <View style={styles.assistantItem}>
                  <Ionicons name="thermometer-outline" size={18} color="#E65100" />
                  <Text style={[styles.assistantLabel, { color: '#E65100' }]}>일교차 커요 · 겉옷 챙기세요</Text>
                </View>
              )}
              {rec.sunscreen && (
                <View style={styles.assistantItem}>
                  <Ionicons name="sunny-outline" size={18} color="#F9A825" />
                  <Text style={[styles.assistantLabel, { color: '#F9A825' }]}>자외선 강해요 · 선크림 바르세요</Text>
                </View>
              )}
            </View>
          </View>
        );
      })()}

      {/* Schedule */}
      <View style={[styles.card, { marginBottom: 28 }]}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardLabel}>오늘 약속</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Appointment')} style={styles.apptMoreBtn}>
            {upcomingCount > 0 && <Text style={styles.apptMoreCount}>전체 {upcomingCount}건</Text>}
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
        {todayAppts.length === 0 ? (
          <View style={styles.emptyApptWrap}>
            <Text style={styles.emptyText}>오늘 예정된 약속이 없습니다.</Text>
            {nextAppt ? (
              <Text style={styles.nextApptHint}>
                D-{nextAppt.dDay} · {formatKoreanDateTime(nextAppt.appointmentTime)} · {nextAppt.title || nextAppt.destAddress}
              </Text>
            ) : (
              <TouchableOpacity onPress={() => navigation.navigate('Appointment')}>
                <Text style={styles.emptyApptLink}>약속 추가하기 →</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {todayAppts.slice(0, 2).map((item) => (
              <View key={item.id} style={styles.scheduleItem}>
                <View style={styles.scheduleIconWrap}>
                  <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.scheduleTitle}>{item.title || item.destAddress}</Text>
                  {item.title && <Text style={styles.scheduleLocation} numberOfLines={1}>{item.destAddress}</Text>}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.scheduleTime}>{formatApptTime(item.appointmentTime)}</Text>
                  {(() => {
                    const alarmMs = new Date(item.appointmentTime).getTime() - item.alarmBeforeMinutes * 60000;
                    if (alarmMs > Date.now()) {
                      const d = new Date(alarmMs);
                      return <Text style={styles.scheduleAlarmHint}>알람 {String(d.getHours()).padStart(2,'0')}:{String(d.getMinutes()).padStart(2,'0')}</Text>;
                    }
                    return null;
                  })()}
                </View>
              </View>
            ))}
            {todayAppts.length > 2 && (
              <TouchableOpacity onPress={() => navigation.navigate('Appointment')} style={styles.scheduleMoreBtn}>
                <Text style={styles.scheduleMoreText}>+{todayAppts.length - 2}건 더 보기</Text>
                <Ionicons name="chevron-forward" size={13} color={colors.primary} />
              </TouchableOpacity>
            )}
          </>
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
  weatherLocationBtn:    { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2, backgroundColor: colors.primaryLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16 },
  weatherLocation:       { fontSize: 11, fontFamily: fonts.semiBold, color: colors.primary },
  weatherLocationChange: { fontSize: 10, fontFamily: fonts.regular, color: colors.primary, opacity: 0.7 },
  hourlyRow:          { gap: 4, paddingVertical: 2 },
  hourlyItem:         { alignItems: 'center', minWidth: 52, paddingHorizontal: 6 },
  hourlyTime:         { fontSize: 10, color: colors.textSecondary, fontFamily: fonts.regular },
  hourlyTemp:         { fontSize: 12, fontFamily: fonts.bold, color: colors.textPrimary },
  assistantCard:    { marginHorizontal: 20, marginBottom: 12, backgroundColor: colors.card, borderRadius: 16, padding: 14, ...cardShadow },
  assistantTitle:   { fontSize: 12, fontFamily: fonts.semiBold, color: colors.textSecondary, marginBottom: 10 },
  assistantRow:     { gap: 8 },
  assistantItem:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  assistantLabel:   { fontSize: 13, fontFamily: fonts.regular, color: colors.textPrimary, flexShrink: 1 },
  departureCard:    { marginHorizontal: 20, borderRadius: 20, backgroundColor: colors.primary, padding: 20, marginBottom: 16 },
  departureLabel:   { fontSize: 13, fontFamily: fonts.regular, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  departureTime:    { fontSize: 44, fontFamily: fonts.extraBold, color: '#fff', letterSpacing: -1 },
  departureCountdown: { fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 2, fontFamily: fonts.medium },
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
  apptMoreBtn:      { flexDirection: 'row', alignItems: 'center', gap: 3 },
  apptMoreCount:    { fontSize: 12, fontFamily: fonts.semiBold, color: colors.primary },
  nextApptHint:     { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  scheduleItem:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  scheduleIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  scheduleTitle:    { fontSize: 14, fontFamily: fonts.semiBold, color: colors.textPrimary },
  scheduleLocation: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 2 },
  scheduleTime:     { fontSize: 12, fontFamily: fonts.semiBold, color: colors.textSecondary },
  scheduleAlarmHint:{ fontSize: 10, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 2 },
  scheduleMoreBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  scheduleMoreText: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.primary },
  footer:           { alignItems: 'center', paddingVertical: 20, gap: 4, marginTop: 8 },
  footerText:       { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted },
  weatherInfoPanel: { backgroundColor: colors.primaryLight, borderRadius: 10, padding: 12, marginTop: 8 },
  weatherInfoLabel: { fontSize: 11, fontFamily: fonts.semiBold, color: colors.primary, marginBottom: 8 },
  cityGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cityBtn:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.card },
  cityBtnActive:    { backgroundColor: colors.primary },
  cityBtnText:      { fontSize: 12, fontFamily: fonts.semiBold, color: colors.textSecondary },
  cityBtnTextActive:{ color: '#fff' },
});
