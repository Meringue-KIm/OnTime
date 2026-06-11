import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Platform, Alert, Linking, AppState, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { colors, fonts } from '../constants/colors';
import { getWeatherSummary, type WeatherSummary } from '../api/weather';
import { useRouteStore } from '../store/routeStore';
import { useAppointmentStore } from '../store/appointmentStore';
import { useTodayStore } from '../store/todayStore';
import { useNotification } from '../hooks/useNotification';
import { useLocation } from '../hooks/useLocation';
import { DEFAULT_LOCATION, type City } from '../constants/locations';
import DepartureCard from '../components/home/DepartureCard';
import WeatherSection from '../components/home/WeatherSection';
import WeatherAssistant from '../components/home/WeatherAssistant';
import AppointmentSection from '../components/home/AppointmentSection';

const logo = require('../../assets/logo.png');
const BANNER_KEY = 'departure_banner_dismissed_date';

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
  const { routes, fetchRoutes } = useRouteStore();
  const { appointments, fetchAppointments } = useAppointmentStore();
  const { coords: gpsCoords } = useLocation();
  const { alarmFired, dismissAlarmBanner } = useNotification();

  const [weather, setWeather] = useState<WeatherSummary | null>(null);
  const [weatherError, setWeatherError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [weatherRefreshToken, setWeatherRefreshToken] = useState(0);
  const [tick, setTick] = useState(0);

  const lastRefreshRef = useRef<number>(0);
  const hourlyScrollRef = useRef<ScrollView>(null);
  const todayStr = new Date().toISOString().slice(0, 10);

  const activeRoute = routes.find(r => r.isActive) ?? routes[0];
  const todayDow = new Date().getDay();
  const isActiveToday = activeRoute?.activeDays?.split(',').map(Number).includes(todayDow) ?? false;

  // 초기 로드
  useEffect(() => {
    fetchRoutes();
    fetchAppointments();
    fetchToday();
  }, []);

  // 배너 dismiss 상태 복원
  useEffect(() => {
    AsyncStorage.getItem(BANNER_KEY).then(v => {
      if (v === todayStr) setBannerDismissed(true);
    });
  }, []);

  // 저장된 도시 선택 복원
  useEffect(() => {
    AsyncStorage.getItem('weather_city').then(v => {
      if (v) { try { setSelectedCity(JSON.parse(v)); } catch {} }
    });
  }, []);

  // 탭 재진입 시 today 갱신 (30초 쿨다운)
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

  // 날씨: 선택 도시 > GPS > 활성 경로 집 > 서울 기본값
  useEffect(() => {
    const lat = selectedCity?.lat ?? gpsCoords?.lat ?? activeRoute?.homeLat ?? DEFAULT_LOCATION.lat;
    const lng = selectedCity?.lng ?? gpsCoords?.lng ?? activeRoute?.homeLng ?? DEFAULT_LOCATION.lng;
    setWeatherError(false);
    getWeatherSummary(lat, lng)
      .then(({ data }) => { setWeather(data); setWeatherError(false); })
      .catch(() => setWeatherError(true));
  }, [selectedCity, gpsCoords?.lat, gpsCoords?.lng, activeRoute?.homeLat, activeRoute?.homeLng, weatherRefreshToken]);

  // 날씨 로드 후 현재 시간 슬롯으로 스크롤
  useEffect(() => {
    if (!weather?.hourly?.length) return;
    const nowHour = new Date().getHours();
    const idx = weather.hourly.reduce((best, item, i) => {
      const h = parseInt(item.time.split(':')[0], 10);
      const bestH = parseInt(weather.hourly[best].time.split(':')[0], 10);
      return Math.abs(h - nowHour) < Math.abs(bestH - nowHour) ? i : best;
    }, 0);
    setTimeout(() => {
      hourlyScrollRef.current?.scrollTo({ x: Math.max(0, idx * 56 - 4), animated: false });
    }, 200);
  }, [weather]);

  // 카운트다운 매분 갱신
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    setWeatherRefreshToken(t => t + 1);
    await Promise.all([fetchRoutes(), fetchAppointments(), fetchToday()]);
    setRefreshing(false);
  };

  const handleSelectCity = (city: City | null) => {
    setSelectedCity(city);
    setShowCityPicker(false);
    if (city) {
      AsyncStorage.setItem('weather_city', JSON.stringify(city)).catch(() => {});
    } else {
      AsyncStorage.removeItem('weather_city').catch(() => {});
    }
  };

  const handleDismissBanner = () => {
    dismissAlarmBanner();
    setBannerDismissed(true);
    AsyncStorage.setItem(BANNER_KEY, todayStr).catch(() => {});
  };

  const handleNavigation = async (destLat?: number, destLng?: number, destAddress?: string) => {
    const route = routes.find(r => r.isActive) ?? routes[0];
    const transportMode = route?.transportMode ?? 'car';

    let lat: number | undefined = destLat;
    let lng: number | undefined = destLng;
    let address: string = destAddress ?? '';

    if (!lat || !lng) {
      const now = new Date();
      const todayAppt = appointments
        .filter(a => !a.isDone && a.dDay === 0 && a.destLat && a.destLng)
        .filter(a => new Date(a.appointmentTime) > now)
        .sort((a, b) => new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime())[0];

      if (todayAppt?.destLat && todayAppt?.destLng) {
        lat = todayAppt.destLat; lng = todayAppt.destLng; address = todayAppt.destAddress;
      } else {
        if (!route?.workLat || !route?.workLng) {
          Alert.alert('위치 정보 없음', '루트의 직장 주소를 검색 목록에서 다시 선택해주세요.');
          return;
        }
        lat = route.workLat; lng = route.workLng; address = route.workAddress;
      }
    }

    const name = encodeURIComponent(address);
    const kakaoMode  = transportMode === 'transit' ? 'PUBLICTRANSIT' : transportMode === 'walk' ? 'FOOT' : 'CAR';
    const naverPath  = transportMode === 'transit' ? 'public' : transportMode === 'walk' ? 'walk' : 'car';
    const googleMode = transportMode === 'transit' ? 'transit' : transportMode === 'walk' ? 'walking' : 'driving';

    const tryOpen = async (url: string) => {
      const can = await Linking.canOpenURL(url).catch(() => false);
      if (can) { Linking.openURL(url); return true; }
      return false;
    };

    if (await tryOpen(`kakaomap://route?ep=${lat},${lng}&by=${kakaoMode}`)) return;
    if (await tryOpen(`nmap://route/${naverPath}?dlat=${lat}&dlng=${lng}&dname=${name}&appname=app.ontime`)) return;
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=${googleMode}`);
  };

  // ── 약속 파생 데이터 ──────────────────────────────────────────────
  const now = new Date(tick >= 0 ? Date.now() : 0);
  const todayAppts = appointments
    .filter(a => !a.isDone && a.dDay === 0 && new Date(a.appointmentTime) > now)
    .sort((a, b) => new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime());
  const nextAppt = appointments
    .filter(a => !a.isDone && a.dDay > 0)
    .sort((a, b) => new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime())[0];
  const upcomingCount = appointments.filter(a => !a.isDone && (
    (a.dDay === 0 && new Date(a.appointmentTime) > now) || a.dDay > 0
  )).length;

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
    if (!today?.recommendedDeparture || today.logDate || !isActiveToday) return null;
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

  const timeBasedBanner = !bannerDismissed && !today?.logDate && (() => {
    if (!today?.recommendedDeparture) return false;
    const [hh, mm] = today.recommendedDeparture.split(':').map(Number);
    const dep = new Date(); dep.setHours(hh, mm, 0, 0);
    const diff = Date.now() - dep.getTime();
    return diff > 0 && diff < 60 * 60 * 1000;
  })();
  const showDepartureBanner = alarmFired || timeBasedBanner;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      onScrollBeginDrag={() => setShowCityPicker(false)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Image source={logo} style={styles.logoImg} resizeMode="contain" />
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsBtn}>
          <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* 출발 배너 */}
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

      {/* Departure Card */}
      <DepartureCard
        today={today}
        todayLoading={todayLoading}
        todayError={todayError}
        cachedAt={cachedAt}
        cacheAgeLabel={cacheAgeLabel}
        activeRoute={activeRoute}
        isActiveToday={isActiveToday}
        departureLabel={departureLabel}
        departureCountdown={departureCountdown}
        onNavigateAlarm={() => navigation.navigate('Alarm')}
        onNavigateRoute={() => navigation.navigate('Route')}
      />

      {/* 내비게이션 버튼 */}
      {activeRoute && !showDepartureBanner && (isActiveToday || todayAppts.length > 0) && (
        <TouchableOpacity style={[styles.navBtn, { marginHorizontal: 20, marginBottom: 12 }]} onPress={() => handleNavigation()}>
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

      {/* 날씨 */}
      <WeatherSection
        weather={weather}
        weatherError={weatherError}
        selectedCity={selectedCity}
        hasGps={!!gpsCoords}
        routeHomeAddress={activeRoute?.homeAddress}
        hourlyScrollRef={hourlyScrollRef}
        showCityPicker={showCityPicker}
        onToggleCityPicker={() => setShowCityPicker(v => !v)}
        onCitySelect={handleSelectCity}
      />

      {/* 준비물 */}
      {weather && <WeatherAssistant weather={weather} />}

      {/* 오늘 약속 */}
      <AppointmentSection
        todayAppts={todayAppts}
        nextAppt={nextAppt}
        upcomingCount={upcomingCount}
        onNavigate={() => navigation.navigate('Appointment')}
      />

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>날씨 제공: 기상청 · 지도: 카카오맵</Text>
        <Text style={styles.footerText}>© 2026 OnTime. All rights reserved.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: colors.bg },
  header:              { paddingHorizontal: 20, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoImg:             { width: 180, height: 81 },
  settingsBtn:         { padding: 6 },
  departureBanner:     { marginHorizontal: 20, marginBottom: 12, backgroundColor: '#1B5E20', borderRadius: 16, padding: 18, gap: 8 },
  departureBannerTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  departureBannerTitle:{ fontSize: 18, fontFamily: fonts.bold, color: '#fff' },
  departureBannerSub:  { fontSize: 13, fontFamily: fonts.regular, color: 'rgba(255,255,255,0.75)' },
  departureBannerBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingVertical: 11, marginTop: 4 },
  departureBannerBtnText: { color: '#fff', fontFamily: fonts.semiBold, fontSize: 14 },
  greetingSection:     { paddingHorizontal: 20, paddingBottom: 12 },
  greeting:            { fontSize: 16, fontFamily: fonts.semiBold, color: colors.textSecondary },
  navBtn:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: 50, paddingVertical: 12 },
  navBtnText:          { color: '#fff', fontFamily: fonts.semiBold, fontSize: 14 },
  card:                { marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12 },
  noRouteBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  noRouteBtnText:      { fontSize: 14, fontFamily: fonts.semiBold, color: colors.primary },
  footer:              { alignItems: 'center', paddingVertical: 20, gap: 4, marginTop: 8 },
  footerText:          { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted },
});
