import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { colors } from '../constants/colors';
import { getToday, type TodayResponse, type WeatherData } from '../api/today';
import { updateFcmToken } from '../api/auth';
import { useRouteStore } from '../store/routeStore';
import { useAppointmentStore } from '../store/appointmentStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function HomeScreen() {
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [todayLoading, setTodayLoading] = useState(true);

  const { routes, fetchRoutes } = useRouteStore();
  const { appointments, fetchAppointments } = useAppointmentStore();

  useEffect(() => {
    fetchRoutes();
    fetchAppointments();
    getToday()
      .then(({ data }) => setToday(data))
      .catch(() => setToday(null))
      .finally(() => setTodayLoading(false));
    registerForPushNotifications();
  }, []);

  async function registerForPushNotifications() {
    if (!Device.isDevice) return;
    const { status: existing } = await Notifications.getPermissionsAsync();
    const { status } = existing === 'granted'
      ? { status: existing }
      : await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    updateFcmToken(token).catch(() => {});
  }

  const activeRoute = routes.find(r => r.isActive) ?? routes[0];

  const upcomingAppts = appointments
    .filter(a => !a.isDone && a.dDay >= 0)
    .sort((a, b) => new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime())
    .slice(0, 3);

  function weatherIconName(icon: string): 'sunny' | 'rainy' | 'snow' | 'partly-sunny' {
    if (icon === 'rainy' || icon === 'sleet') return 'rainy';
    if (icon === 'snowy') return 'snow';
    return 'sunny';
  }

  function formatApptTime(isoStr: string): string {
    const d = new Date(isoStr);
    const hour = d.getHours();
    const min = String(d.getMinutes()).padStart(2, '0');
    const ampm = hour < 12 ? 'AM' : 'PM';
    const h = String(hour % 12 || 12).padStart(2, '0');
    return `${h}:${min} ${ampm}`;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Ionicons name="airplane" size={22} color={colors.primary} />
          <Text style={styles.appName}>OnTime</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>나</Text>
        </View>
      </View>

      {/* Greeting */}
      <View style={styles.greetingSection}>
        <Text style={styles.greeting}>좋은 아침이에요 👋</Text>
        <Text style={styles.greetingSub}>오늘도 OnTime으로 여유있게 출발하세요.</Text>
      </View>

      {/* Departure Card */}
      <View style={styles.departureCard}>
        <Text style={styles.departureLabel}>다음 출발 시간</Text>
        {todayLoading ? (
          <ActivityIndicator color="#fff" size="large" style={{ marginVertical: 8 }} />
        ) : today?.recommendedDeparture ? (
          <>
            <Text style={styles.departureTime}>
              {today.recommendedDeparture.substring(0, 5)}
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
                  <Ionicons name={weatherIconName(today.weather.icon)} size={13} color="#fff" />
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
      {activeRoute && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>경로 미리보기</Text>
          <View style={styles.routeRow}>
            <View style={styles.routePoints}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <View style={styles.routeDash} />
              <View style={[styles.dot, { backgroundColor: colors.success }]} />
            </View>
            <View style={styles.routeTexts}>
              <Text style={styles.routeText}>{activeRoute.homeAddress}</Text>
              <Text style={[styles.routeText, { color: colors.textMuted, fontSize: 12 }]}>
                {activeRoute.alarmBeforeMinutes}분 여유
              </Text>
              <Text style={styles.routeText}>{activeRoute.workAddress}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.navBtn}>
            <Ionicons name="navigate" size={16} color="#fff" />
            <Text style={styles.navBtnText}>내비게이션 시작</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Schedule */}
      <View style={[styles.card, { marginBottom: 28 }]}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardLabel}>다가오는 약속</Text>
        </View>

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

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.bg },
  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 8 },
  logoRow:          { flexDirection: 'row', alignItems: 'center', gap: 6 },
  appName:          { fontSize: 18, fontWeight: '700', color: colors.primary },
  avatar:           { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText:       { color: '#fff', fontWeight: '700', fontSize: 14 },
  greetingSection:  { paddingHorizontal: 20, paddingVertical: 12 },
  greeting:         { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  greetingSub:      { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  departureCard:    { marginHorizontal: 20, borderRadius: 16, backgroundColor: colors.primary, padding: 20, marginBottom: 16 },
  departureLabel:   { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  departureTime:    { fontSize: 44, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  noRouteText:      { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginVertical: 12 },
  trafficRow:       { marginTop: 8 },
  trafficBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  trafficBadgeText: { color: '#fff', fontSize: 12 },
  card:             { marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardLabel:        { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 10 },
  rowBetween:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  routeRow:         { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  routePoints:      { alignItems: 'center', gap: 4 },
  dot:              { width: 10, height: 10, borderRadius: 5 },
  routeDash:        { width: 2, height: 24, backgroundColor: colors.border },
  routeTexts:       { gap: 10, flex: 1 },
  routeText:        { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  navBtn:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12 },
  navBtnText:       { color: '#fff', fontWeight: '600', fontSize: 14 },
  emptyText:        { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 12 },
  scheduleItem:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  scheduleIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  scheduleTitle:    { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  scheduleLocation: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  scheduleTime:     { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
});
