import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, ActivityIndicator, Image, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { setupNotificationChannel } from '../hooks/useNotification';
import { sendTestAlarm } from '../api/auth';
import { getErrorMessage } from '../utils/errors';
import { colors, fonts, cardShadow } from '../constants/colors';

const logo = require('../../assets/logo.png');
import { Alert } from 'react-native';
import { getToday } from '../api/today';
import { useRouteStore } from '../store/routeStore';
import { DAYS_OF_WEEK } from '../constants/dates';
import { BUFFER_MIN, BUFFER_MAX, BUFFER_STEP } from '../constants/defaults';
import { extractTimeHHmm } from '../utils/timeFormat';

const STORAGE_KEYS = {
  vibration:     'alarm_vibration',
  gradualVolume: 'alarm_gradual_volume',
  wakeLight:     'alarm_wake_light',
};

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function getNextAlarmLabel(departureTimeStr: string | null, activeDays: number[]): string | null {
  if (!departureTimeStr || activeDays.length === 0) return null;
  const [hh, mm] = departureTimeStr.split(':').map(Number);
  const now = new Date();
  for (let i = 0; i < 8; i++) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + i);
    candidate.setHours(hh, mm, 0, 0);
    if (candidate <= now) continue;
    const dow = candidate.getDay();
    if (!activeDays.includes(dow)) continue;
    const ampm = hh < 12 ? '오전' : '오후';
    const h12 = hh % 12 === 0 ? 12 : hh % 12;
    const timeStr = `${ampm} ${h12}:${String(mm).padStart(2, '0')}`;
    if (i === 0) return `오늘 ${timeStr}`;
    if (i === 1) return `내일 ${timeStr}`;
    return `${candidate.getMonth() + 1}/${candidate.getDate()}(${DAY_LABELS[dow]}) ${timeStr}`;
  }
  return null;
}

export default function AlarmScreen() {
  const insets = useSafeAreaInsets();
  const [departureTime, setDepartureTime] = useState<string | null>(null);
  const [loading, setLoading]             = useState(true);
  const [todayError, setTodayError]       = useState(false);

  const [notifStatus, setNotifStatus]     = useState<string | null>(null);
  const [activeDays, setActiveDays]       = useState([1, 2, 3, 4, 5]);
  const [vibration, setVibration]         = useState(true);
  const [gradualVolume, setGradualVolume] = useState(true);
  const [wakeLight, setWakeLight]         = useState(false);

  const { routes, fetchRoutes, saveRoute } = useRouteStore();
  const activeRoute = routes.find(r => r.isActive) ?? routes[0];
  const [buffer, setBuffer] = useState(20);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  // 마운트 시 저장된 설정 불러오기
  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }: { status: string }) => setNotifStatus(status));
  }, []);

  useEffect(() => {
    fetchRoutes();
    getToday()
      .then(({ data }) => {
        if (data.recommendedDeparture) setDepartureTime(extractTimeHHmm(data.recommendedDeparture));
        setTodayError(false);
      })
      .catch(() => setTodayError(true))
      .finally(() => setLoading(false));



    AsyncStorage.multiGet([STORAGE_KEYS.vibration, STORAGE_KEYS.gradualVolume, STORAGE_KEYS.wakeLight])
      .then(pairs => {
        const map = Object.fromEntries(pairs.map(([k, v]) => [k, v]));
        if (map[STORAGE_KEYS.vibration]     !== null) setVibration(map[STORAGE_KEYS.vibration] === 'true');
        if (map[STORAGE_KEYS.gradualVolume] !== null) setGradualVolume(map[STORAGE_KEYS.gradualVolume] === 'true');
        if (map[STORAGE_KEYS.wakeLight]     !== null) setWakeLight(map[STORAGE_KEYS.wakeLight] === 'true');
      })
      .catch(() => {});
  }, []);

  // 로드 실패 시 5초 후 자동 재시도
  useEffect(() => {
    if (!todayError) return;
    const timer = setTimeout(() => {
      setLoading(true);
      getToday()
        .then(({ data }) => {
          if (data.recommendedDeparture) setDepartureTime(extractTimeHHmm(data.recommendedDeparture));
          setTodayError(false);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 5000);
    return () => clearTimeout(timer);
  }, [todayError]);

  // 루트 로드 후 설정 반영 (초기 1회만)
  useEffect(() => {
    if (!activeRoute) return;
    setBuffer(activeRoute.alarmBeforeMinutes);
    if (activeRoute.activeDays) {
      setActiveDays(activeRoute.activeDays.split(',').map(Number));
    }
    isInitialMount.current = false;
  }, [activeRoute?.id]);

  // 요일/버퍼 변경 시 자동 저장
  useEffect(() => {
    if (isInitialMount.current) return;
    autoSave(buffer, activeDays);
  }, [buffer, activeDays]);

  const autoSave = useCallback((newBuffer: number, newDays: number[]) => {
    if (!activeRoute) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveStatus('saving');
    debounceRef.current = setTimeout(async () => {
      try {
        await saveRoute({
          homeAddress:        activeRoute.homeAddress,
          homeLat:            activeRoute.homeLat,
          homeLng:            activeRoute.homeLng,
          workAddress:        activeRoute.workAddress,
          workLat:            activeRoute.workLat,
          workLng:            activeRoute.workLng,
          arrivalTime:        activeRoute.arrivalTime,
          alarmBeforeMinutes: newBuffer,
          activeDays:         newDays.join(','),
        }, activeRoute.id);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('idle');
      }
    }, 1000);
  }, [activeRoute, saveRoute]);

  const toggleDay = (i: number) =>
    setActiveDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i]);

  const handleSoundToggle = async (key: string, value: boolean) => {
    await AsyncStorage.setItem(key, String(value));
    // 진동 설정 변경 시 Android 알림 채널 재적용
    if (key === STORAGE_KEYS.vibration) {
      await setupNotificationChannel();
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Image source={logo} style={styles.logoImg} resizeMode="contain" />
      </View>

      {notifStatus === 'denied' && (
        <TouchableOpacity style={styles.permissionBanner} onPress={() => Linking.openSettings()}>
          <Ionicons name="alert-circle-outline" size={16} color="#D32F2F" />
          <Text style={styles.permissionBannerText}>알림 권한이 꺼져 있습니다. 알람을 받으려면 설정에서 허용해주세요.</Text>
          <Ionicons name="chevron-forward" size={14} color="#D32F2F" />
        </TouchableOpacity>
      )}

      {/* 오늘 출발 시간 */}
      <View style={styles.wakeCard}>
        <Text style={styles.wakeLabel}>오늘 추천 출발 시간</Text>
        {loading ? (
          <ActivityIndicator color="#fff" size="large" style={{ marginVertical: 12 }} />
        ) : todayError ? (
          <Text style={styles.wakeTimePlaceholder}>--:--</Text>
        ) : departureTime ? (
          <Text style={styles.wakeTime}>{departureTime}</Text>
        ) : (
          <Text style={styles.wakeTimePlaceholder}>루트를 설정해주세요</Text>
        )}
        <View style={styles.badgeRow}>
          {activeRoute && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>여유 {activeRoute.alarmBeforeMinutes}분 설정됨</Text>
            </View>
          )}
        </View>
        {!loading && (() => {
          const label = getNextAlarmLabel(departureTime, activeDays);
          return label ? (
            <View style={styles.nextAlarmRow}>
              <Ionicons name="alarm-outline" size={13} color="rgba(255,255,255,0.8)" />
              <Text style={styles.nextAlarmText}>다음 알람 · {label}</Text>
            </View>
          ) : null;
        })()}
      </View>

      {/* 반복 요일 */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>📅 반복 일정 설정</Text>
          {saveStatus === 'saving' && <Text style={styles.autoSaveText}>저장 중...</Text>}
          {saveStatus === 'saved'  && <Text style={[styles.autoSaveText, { color: colors.success }]}>✓ 저장됨</Text>}
        </View>
        <View style={styles.daysRow}>
          {DAYS_OF_WEEK.map((day, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.dayBtn, activeDays.includes(i) && styles.dayBtnActive]}
              onPress={() => toggleDay(i)}
            >
              <Text style={[styles.dayText, activeDays.includes(i) && styles.dayTextActive]}>
                {day}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 여유 시간 */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>✨ 여유 시간 (Buffer)</Text>
        <View style={styles.bufferDisplay}>
          <Text style={styles.bufferValue}>{buffer}</Text>
          <Text style={styles.bufferUnit}>분</Text>
        </View>
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={styles.infoText}>
            설정한 여유 시간만큼 일찍 출발 알람이 울립니다. 날씨 상황에 따라 자동으로 추가됩니다.
          </Text>
        </View>
        <View style={styles.bufferControls}>
          <TouchableOpacity style={styles.bufferBtn} onPress={() => setBuffer(b => Math.max(BUFFER_MIN, b - BUFFER_STEP))}>
            <Ionicons name="remove" size={20} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.bufferControlValue}>{buffer}분</Text>
          <TouchableOpacity style={styles.bufferBtn} onPress={() => setBuffer(b => Math.min(BUFFER_MAX, b + BUFFER_STEP))}>
            <Ionicons name="add" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 테스트 알람 */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🧪 알람 테스트</Text>
        <Text style={styles.testDesc}>설정이 올바른지 즉시 FCM 알림을 보내 확인합니다.</Text>
        <TouchableOpacity
          style={styles.testBtn}
          onPress={() =>
            sendTestAlarm()
              .then(() => Alert.alert('전송 완료', '잠시 후 알림이 도착합니다.\n알림이 오지 않으면 설정 → 알림에서 OnTime 알림이 허용되어 있는지 확인해주세요.'))
              .catch(() => Alert.alert('알람 테스트 실패', '앱을 완전히 종료했다가 다시 열고 시도해주세요.\n문제가 계속되면 로그아웃 후 재로그인해주세요.'))
          }
        >
          <Ionicons name="notifications-outline" size={18} color="#fff" />
          <Text style={styles.testBtnText}>테스트 알람 보내기</Text>
        </TouchableOpacity>
      </View>

      {/* 사운드 설정 */}
      <View style={[styles.card, { marginBottom: 28 }]}>
        <Text style={styles.sectionTitle}>🔔 사운드 설정</Text>
        {[
          { label: '진동 알림',   sub: 'Android 알림 채널 진동 활성화',     icon: 'phone-portrait-outline', key: STORAGE_KEYS.vibration,     value: vibration,     set: setVibration },
          { label: '점진적 음량', sub: '포그라운드 알림 수신 시 음량을 서서히 높입니다', icon: 'volume-medium-outline', key: STORAGE_KEYS.gradualVolume, value: gradualVolume, set: setGradualVolume },
          { label: '기상 라이트', sub: '알림 수신 시 화면 최대 밝기 (1분)',   icon: 'sunny-outline',          key: STORAGE_KEYS.wakeLight,     value: wakeLight,     set: setWakeLight },
        ].map((item, i) => (
          <View key={i} style={styles.settingRow}>
            <View style={styles.settingIconWrap}>
              <Ionicons name={item.icon as any} size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>{item.label}</Text>
              <Text style={styles.settingSub}>{item.sub}</Text>
            </View>
            <Switch
              value={item.value}
              onValueChange={(v) => { item.set(v); handleSoundToggle(item.key, v); }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        ))}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: colors.bg },
  header:              { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingBottom: 8 },
  permissionBanner:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginBottom: 8, backgroundColor: '#FFEBEE', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  permissionBannerText:{ flex: 1, fontSize: 12, fontFamily: fonts.regular, color: '#D32F2F', lineHeight: 17 },
  logoImg:             { width: 180, height: 81 },
  wakeCard:            { margin: 20, backgroundColor: colors.primary, borderRadius: 16, padding: 24, alignItems: 'center' },
  wakeLabel:           { fontSize: 13, fontFamily: fonts.regular, color: 'rgba(255,255,255,0.75)', marginBottom: 4 },
  wakeTime:            { fontSize: 48, fontFamily: fonts.extraBold, color: '#fff', letterSpacing: -1 },
  wakeTimePlaceholder: { fontSize: 16, fontFamily: fonts.regular, color: 'rgba(255,255,255,0.7)', marginVertical: 12 },
  badgeRow:            { flexDirection: 'row', gap: 8, marginTop: 12 },
  badge:               { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText:           { fontSize: 12, fontFamily: fonts.regular, color: '#fff' },
  nextAlarmRow:        { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  nextAlarmText:       { fontSize: 12, fontFamily: fonts.semiBold, color: 'rgba(255,255,255,0.9)' },
  card:                { marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, ...cardShadow },
  sectionTitle:        { fontSize: 15, fontFamily: fonts.bold, color: colors.textPrimary, marginBottom: 14 },
  rowBetween:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  autoSaveText:        { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted },
  daysRow:             { flexDirection: 'row', justifyContent: 'space-between' },
  dayBtn:              { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  dayBtnActive:        { backgroundColor: colors.primary },
  dayText:             { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textSecondary },
  dayTextActive:       { color: '#fff' },
  bufferDisplay:       { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginBottom: 16 },
  bufferValue:         { fontSize: 48, fontFamily: fonts.extraBold, color: colors.textPrimary },
  bufferUnit:          { fontSize: 18, fontFamily: fonts.regular, color: colors.textSecondary },
  infoBanner:          { flexDirection: 'row', gap: 8, backgroundColor: colors.primaryLight, borderRadius: 10, padding: 10, marginBottom: 12 },
  infoText:            { flex: 1, fontSize: 12, fontFamily: fonts.regular, color: colors.textSecondary, lineHeight: 18 },
  bufferControls:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  bufferBtn:           { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  bufferControlValue:  { fontSize: 18, fontFamily: fonts.bold, color: colors.textPrimary, minWidth: 60, textAlign: 'center' },
  settingRow:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  settingIconWrap:     { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  settingLabel:        { fontSize: 14, fontFamily: fonts.semiBold, color: colors.textPrimary },
  settingSub:          { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 2 },
  testDesc:            { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted, marginBottom: 12 },
  testBtn:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13 },
  testBtnText:         { color: '#fff', fontFamily: fonts.semiBold, fontSize: 14 },
});
