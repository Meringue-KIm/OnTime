import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, cardShadow } from '../constants/colors';

const logo = require('../../assets/logo.png');
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

export default function AlarmScreen() {
  const insets = useSafeAreaInsets();
  const [departureTime, setDepartureTime] = useState<string | null>(null);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);

  const [activeDays, setActiveDays]       = useState([1, 2, 3, 4, 5]);
  const [vibration, setVibration]         = useState(true);
  const [gradualVolume, setGradualVolume] = useState(true);
  const [wakeLight, setWakeLight]         = useState(false);

  const { routes, fetchRoutes, saveRoute } = useRouteStore();
  const activeRoute = routes.find(r => r.isActive) ?? routes[0];
  const [buffer, setBuffer] = useState(20);

  // 마운트 시 저장된 설정 불러오기
  useEffect(() => {
    fetchRoutes();
    getToday()
      .then(({ data }) => {
        if (data.recommendedDeparture) setDepartureTime(extractTimeHHmm(data.recommendedDeparture));
      })
      .catch(() => {})
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

  // 루트 로드 후 설정 반영
  useEffect(() => {
    if (!activeRoute) return;
    setBuffer(activeRoute.alarmBeforeMinutes);
    if (activeRoute.activeDays) {
      setActiveDays(activeRoute.activeDays.split(',').map(Number));
    }
  }, [activeRoute]);

  const handleSaveBuffer = async () => {
    if (!activeRoute) return;
    setSaving(true);
    try {
      await saveRoute({
        homeAddress:       activeRoute.homeAddress,
        homeLat:           activeRoute.homeLat,
        homeLng:           activeRoute.homeLng,
        workAddress:       activeRoute.workAddress,
        workLat:           activeRoute.workLat,
        workLng:           activeRoute.workLng,
        arrivalTime:       activeRoute.arrivalTime,
        alarmBeforeMinutes: buffer,
        activeDays:        activeDays.join(','),
      }, activeRoute.id);
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (i: number) =>
    setActiveDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i]);

  const handleSoundToggle = async (key: string, value: boolean) => {
    await AsyncStorage.setItem(key, String(value));
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Image source={logo} style={styles.logoImg} resizeMode="contain" />
      </View>

      {/* 오늘 출발 시간 */}
      <View style={styles.wakeCard}>
        <Text style={styles.wakeLabel}>오늘 추천 출발 시간</Text>
        {loading ? (
          <ActivityIndicator color="#fff" size="large" style={{ marginVertical: 12 }} />
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
      </View>

      {/* 반복 요일 */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>📅 반복 일정 설정</Text>
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSaveBuffer}
            disabled={saving || !activeRoute}
          >
            <Text style={styles.saveBtnText}>{saving ? '저장 중...' : '저장'}</Text>
          </TouchableOpacity>
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

      {/* 사운드 설정 */}
      <View style={[styles.card, { marginBottom: 28 }]}>
        <Text style={styles.sectionTitle}>🔔 사운드 설정</Text>
        {[
          { label: '진동 알림',   sub: '부드러운 기상 진동',       icon: 'phone-portrait-outline', key: STORAGE_KEYS.vibration,     value: vibration,     set: setVibration },
          { label: '점진적 음량', sub: '서서히 커지는 알람 소리',   icon: 'volume-medium-outline',  key: STORAGE_KEYS.gradualVolume, value: gradualVolume, set: setGradualVolume },
          { label: '기상 라이트', sub: '화면 밝기로 서서히 밝힘',   icon: 'sunny-outline',          key: STORAGE_KEYS.wakeLight,     value: wakeLight,     set: setWakeLight },
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
  logoImg:             { width: 180, height: 81 },
  wakeCard:            { margin: 20, backgroundColor: colors.primary, borderRadius: 16, padding: 24, alignItems: 'center' },
  wakeLabel:           { fontSize: 13, fontFamily: fonts.regular, color: 'rgba(255,255,255,0.75)', marginBottom: 4 },
  wakeTime:            { fontSize: 48, fontFamily: fonts.extraBold, color: '#fff', letterSpacing: -1 },
  wakeTimePlaceholder: { fontSize: 16, fontFamily: fonts.regular, color: 'rgba(255,255,255,0.7)', marginVertical: 12 },
  badgeRow:            { flexDirection: 'row', gap: 8, marginTop: 12 },
  badge:               { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText:           { fontSize: 12, fontFamily: fonts.regular, color: '#fff' },
  card:                { marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, ...cardShadow },
  sectionTitle:        { fontSize: 15, fontFamily: fonts.bold, color: colors.textPrimary, marginBottom: 14 },
  rowBetween:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  saveBtn:             { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  saveBtnText:         { color: '#fff', fontFamily: fonts.semiBold, fontSize: 13 },
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
});
