import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, ActivityIndicator, Image, Linking, Platform, RefreshControl } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { setupNotificationChannel } from '../hooks/useNotification';
import { sendTestAlarm } from '../api/auth';
import { getErrorMessage } from '../utils/errors';
import { colors, fonts, cardShadow } from '../constants/colors';

const logo = require('../../assets/logo.png');
import { Alert } from 'react-native';
import { useTodayStore } from '../store/todayStore';
import { useRouteStore } from '../store/routeStore';
import { DAYS_OF_WEEK } from '../constants/dates';
import { BUFFER_MIN, BUFFER_MAX, BUFFER_STEP } from '../constants/defaults';
import { extractTimeHHmm } from '../utils/timeFormat';

const STORAGE_KEYS = {
  vibration: 'alarm_vibration',
};

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function getNextAlarmLabel(departureTimeStr: string | null, activeDays: number[], skipToday = false): string | null {
  if (!departureTimeStr || activeDays.length === 0) return null;
  const [hh, mm] = departureTimeStr.split(':').map(Number);
  const now = new Date();
  for (let i = 0; i < 8; i++) {
    if (i === 0 && skipToday) continue;
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
  const navigation = useNavigation<any>();
  const { today, loading, error: todayError, fetchToday } = useTodayStore();
  const departureTime = today?.recommendedDeparture ? extractTimeHHmm(today.recommendedDeparture) : null;

  const [notifStatus, setNotifStatus]     = useState<string | null>(null);
  const [activeDays, setActiveDays]       = useState([1, 2, 3, 4, 5]);
  const [vibration, setVibration]         = useState(true);
  const [refreshing, setRefreshing]       = useState(false);

  const { routes, fetchRoutes, saveRoute, skipToday } = useRouteStore();
  const activeRoute = routes.find(r => r.isActive) ?? routes[0];
  const [buffer, setBuffer] = useState(20);

  // 버퍼 변경 시 즉시 출발 시간 계산 (단, 오늘 알람 발송 완료 후에는 서버 값 유지)
  const localDepartureTime = React.useMemo(() => {
    if (today?.logDate) return null; // 발송 완료 → 서버 값 그대로, 혼란 방지
    if (!today?.drivingMinutes || !activeRoute?.arrivalTime) return null;
    const arrParts = activeRoute.arrivalTime.split(':').map(Number);
    const arrivalMin = arrParts[0] * 60 + arrParts[1];
    const travel = today.drivingMinutes + (today.weather?.bufferMinutes ?? 0);
    const personal = today.personalBuffer ?? 0;
    const depMin = arrivalMin - travel - buffer - personal;
    const norm = ((depMin % 1440) + 1440) % 1440;
    const h = Math.floor(norm / 60);
    const m = norm % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }, [today?.logDate, buffer, today?.drivingMinutes, today?.weather?.bufferMinutes, today?.personalBuffer, activeRoute?.arrivalTime]);

  const displayDepartureTime = localDepartureTime ?? departureTime;
  const [wakeUpEnabled, setWakeUpEnabled] = useState<boolean | null>(null);
  const [wakeUpMinutes, setWakeUpMinutes] = useState(60);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [skipLoading, setSkipLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);
  const skipNextSaveRef = useRef(false);

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }: { status: string }) => setNotifStatus(status));
  }, []);

  useEffect(() => {
    fetchRoutes();
    if (!today) fetchToday();
    AsyncStorage.getItem(STORAGE_KEYS.vibration)
      .then(v => { if (v !== null) setVibration(v === 'true'); })
      .catch(() => {});
  }, []);

  // 루트 로드 후 설정 반영 (초기 1회만)
  useEffect(() => {
    if (!activeRoute) return;
    skipNextSaveRef.current = true; // 로드 직후 autoSave 한 번 건너뜀
    setBuffer(activeRoute.alarmBeforeMinutes);
    if (activeRoute.activeDays) {
      setActiveDays(activeRoute.activeDays.split(',').map(Number));
    }
    if (activeRoute.wakeUpBeforeMinutes != null) {
      setWakeUpEnabled(true);
      setWakeUpMinutes(activeRoute.wakeUpBeforeMinutes);
    } else {
      setWakeUpEnabled(false); // null → false: 로드 완료 후 실제 값 확정
    }
    isInitialMount.current = false;
  }, [activeRoute?.id, activeRoute?.activeDays]);

  // 요일/버퍼/기상알람 변경 시 자동 저장 (wakeUpEnabled null = 아직 로드 중, 저장 안 함)
  useEffect(() => {
    if (isInitialMount.current) return;
    if (wakeUpEnabled === null) return;
    if (skipNextSaveRef.current) { skipNextSaveRef.current = false; return; }
    autoSave(buffer, activeDays, wakeUpEnabled ? wakeUpMinutes : null);
  }, [buffer, activeDays, wakeUpEnabled, wakeUpMinutes]);

  const autoSave = useCallback((newBuffer: number, newDays: number[], newWakeUp: number | null) => {
    if (!activeRoute) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveStatus('saving');
    debounceRef.current = setTimeout(async () => {
      try {
        await saveRoute({
          homeAddress:          activeRoute.homeAddress,
          homeLat:              activeRoute.homeLat,
          homeLng:              activeRoute.homeLng,
          workAddress:          activeRoute.workAddress,
          workLat:              activeRoute.workLat,
          workLng:              activeRoute.workLng,
          arrivalTime:          activeRoute.arrivalTime,
          alarmBeforeMinutes:   newBuffer,
          activeDays:           newDays.join(','),
          wakeUpBeforeMinutes:  newWakeUp,
          transportMode:        activeRoute.transportMode as 'car' | 'transit' | 'walk',
          customTravelMinutes:  activeRoute.customTravelMinutes,
        }, activeRoute.id);
        fetchToday(); // 버퍼/요일 변경 반영된 출발 시간 즉시 갱신
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('idle');
        Alert.alert('저장 실패', '설정을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.');
      }
    }, 1000);
  }, [activeRoute, saveRoute, fetchToday]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchRoutes(), fetchToday()]);
    setRefreshing(false);
  };

  const toggleDay = (i: number) =>
    setActiveDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i]);

  const handleSoundToggle = async (key: string, value: boolean) => {
    await AsyncStorage.setItem(key, String(value));
    // 진동 설정 변경 시 Android 알림 채널 재적용
    if (key === STORAGE_KEYS.vibration) {
      await setupNotificationChannel();
    }
  };

  const wakeLabel = (() => {
    if (!today?.recommendedDeparture) return '추천 출발 시간';
    const [hh, mm] = today.recommendedDeparture.split(':').map(Number);
    const dep = new Date(); dep.setHours(hh, mm, 0, 0);
    if (today.logDate && dep <= new Date()) return '오늘 출발 완료';
    return '오늘 추천 출발 시간';
  })();

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
    >

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Image source={logo} style={styles.logoImg} resizeMode="contain" />
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsBtn}>
          <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.descBanner}>
        <Ionicons name="alarm-outline" size={16} color={colors.primary} />
        <Text style={styles.descBannerText}>매일 반복되는 출근 알람을 관리하세요. 여유 시간과 반복 요일을 설정하면 자동으로 알람이 울려요.</Text>
      </View>

      {/* 어떤 루트를 수정 중인지 안내 */}
      {activeRoute && (
        <View style={styles.routeInfoBanner}>
          <Ionicons name="navigate-outline" size={14} color={colors.primary} />
          <Text style={styles.routeInfoText} numberOfLines={1}>
            <Text style={{ fontFamily: fonts.bold }}>알람 적용 루트:</Text>{'  '}
            {activeRoute.homeAddress.split(' ').slice(0, 2).join(' ')} → {activeRoute.workAddress.split(' ').slice(0, 2).join(' ')}
          </Text>
        </View>
      )}
      {activeRoute && !activeRoute.isActive && routes.length > 0 && (
        <TouchableOpacity style={styles.inactiveRouteBanner} onPress={() => navigation.navigate('Route')}>
          <Ionicons name="alert-circle-outline" size={15} color="#E65100" />
          <Text style={styles.inactiveRouteBannerText}>활성 루트가 없어 알람이 울리지 않아요. 탭해서 루트 탭으로 이동하세요.</Text>
          <Ionicons name="chevron-forward" size={13} color="#E65100" />
        </TouchableOpacity>
      )}

      {notifStatus === 'denied' && (
        <TouchableOpacity style={styles.permissionBanner} onPress={() => Linking.openSettings()}>
          <Ionicons name="alert-circle-outline" size={16} color="#D32F2F" />
          <Text style={styles.permissionBannerText}>알림 권한이 꺼져 있습니다. 알람을 받으려면 설정에서 허용해주세요.</Text>
          <Ionicons name="chevron-forward" size={14} color="#D32F2F" />
        </TouchableOpacity>
      )}

      {/* 오늘 출발 시간 */}
      <View style={styles.wakeCard}>
        <Text style={styles.wakeLabel}>{wakeLabel}</Text>
        {loading ? (
          <ActivityIndicator color="#fff" size="large" style={{ marginVertical: 12 }} />
        ) : todayError ? (
          <View style={{ alignItems: 'center', gap: 4, marginVertical: 8 }}>
            <Text style={styles.wakeTimePlaceholder}>--:--</Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', textAlign: 'center' }}>서버에 연결할 수 없습니다. 당겨서 새로고침하거나 잠시 후 자동으로 재시도합니다.</Text>
          </View>
        ) : displayDepartureTime ? (
          <>
            <Text style={styles.wakeTime}>{displayDepartureTime}</Text>
            <Text style={styles.wakeTimeSubLabel}>
              {today?.logDate ? '오늘 알람이 발송됐습니다' : '이 시각에 알람이 울립니다'}
            </Text>
          </>
        ) : (
          <Text style={styles.wakeTimePlaceholder}>루트를 설정해주세요</Text>
        )}
        <View style={styles.badgeRow}>
          {activeRoute && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>여유 {buffer}분 설정됨</Text>
            </View>
          )}
          {activeRoute?.isSkippedToday && (
            <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.35)' }]}>
              <Text style={styles.badgeText}>오늘 건너뜀</Text>
            </View>
          )}
        </View>
        {!loading && (() => {
          const label = getNextAlarmLabel(displayDepartureTime, activeDays, activeRoute?.isSkippedToday ?? false);
          if (!label) return null;
          const isToday = label.startsWith('오늘');
          return (
            <View style={[styles.nextAlarmRow, isToday && styles.nextAlarmRowHighlight]}>
              <Ionicons name="alarm" size={14} color="#fff" />
              <Text style={[styles.nextAlarmText, isToday && { fontWeight: '700' }]}>
                다음 알람 · {label}
              </Text>
            </View>
          );
        })()}
        {!loading && !getNextAlarmLabel(displayDepartureTime, activeDays, activeRoute?.isSkippedToday ?? false) && activeRoute && (
          <View style={styles.nextAlarmRow}>
            <Ionicons name="alert-circle-outline" size={13} color="rgba(255,255,255,0.7)" />
            <Text style={[styles.nextAlarmText, { color: 'rgba(255,255,255,0.7)' }]}>
              활성 요일이 설정되지 않았어요
            </Text>
          </View>
        )}
      </View>

      {/* 반복 요일 / 여유 시간 — 루트 없으면 안내만 표시 */}
      {!activeRoute && !loading ? (
        <View style={[styles.card, { alignItems: 'center', paddingVertical: 24 }]}>
          <Ionicons name="navigate-outline" size={32} color={colors.textMuted} />
          <Text style={styles.noRouteMsg}>반복 요일과 여유 시간을 설정하려면{'\n'}루트를 먼저 등록해주세요.</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Route')}>
            <Text style={styles.noRouteMsgLink}>루트 등록하러 가기 →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* 반복 요일 */}
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>📅 반복 일정 설정</Text>
              {saveStatus === 'saving' && <Text style={styles.autoSaveText}>저장 중...</Text>}
              {saveStatus === 'saved'  && <Text style={[styles.autoSaveText, { color: colors.success }]}>✓ 저장됨</Text>}
            </View>
            {today?.logDate && (
              <View style={[styles.infoBanner, { marginTop: 0, marginBottom: 8 }]}>
                <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
                <Text style={[styles.infoText, { color: '#2E7D32' }]}>오늘 알람은 이미 발송됐어요. 변경 사항은 내일부터 적용됩니다.</Text>
              </View>
            )}
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
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>✨ 여유 시간 (Buffer)</Text>
              {saveStatus === 'saving' && <Text style={styles.autoSaveText}>저장 중...</Text>}
              {saveStatus === 'saved'  && <Text style={[styles.autoSaveText, { color: colors.success }]}>✓ 저장됨</Text>}
            </View>
            {today?.logDate && (
              <View style={[styles.infoBanner, { marginTop: 0, marginBottom: 8 }]}>
                <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
                <Text style={[styles.infoText, { color: '#2E7D32' }]}>오늘 알람은 이미 발송됐어요. 변경 사항은 내일부터 적용됩니다.</Text>
              </View>
            )}
            <View style={styles.bufferDisplay}>
              <Text style={styles.bufferValue}>{buffer}</Text>
              <Text style={styles.bufferUnit}>분</Text>
            </View>
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
              <Text style={styles.infoText}>
                알람 시각 = 도착 목표 - 이동 시간 - 여유 {buffer}분{today?.drivingMinutes ? ` (이동 ${today.drivingMinutes}분)` : ''}{'\n'}날씨·교통 상황에 따라 자동으로 추가됩니다.
              </Text>
            </View>
            <View style={styles.bufferControls}>
              <TouchableOpacity
                style={[styles.bufferBtn, buffer <= BUFFER_MIN && styles.bufferBtnDisabled]}
                onPress={() => setBuffer(b => Math.max(BUFFER_MIN, b - BUFFER_STEP))}
                disabled={buffer <= BUFFER_MIN}
              >
                <Ionicons name="remove" size={20} color={buffer <= BUFFER_MIN ? colors.textMuted : colors.primary} />
              </TouchableOpacity>
              <Text style={styles.bufferControlValue}>{buffer}분</Text>
              <TouchableOpacity
                style={[styles.bufferBtn, buffer >= BUFFER_MAX && styles.bufferBtnDisabled]}
                onPress={() => setBuffer(b => Math.min(BUFFER_MAX, b + BUFFER_STEP))}
                disabled={buffer >= BUFFER_MAX}
              >
                <Ionicons name="add" size={20} color={buffer >= BUFFER_MAX ? colors.textMuted : colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {/* 오늘 쉬어요 */}
      {activeRoute && (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.sectionTitle}>🏖️ 오늘 알람 건너뛰기</Text>
              <Text style={[styles.autoSaveText, { marginTop: -10, marginBottom: 4 }]}>
                재택·반차·휴가 등 오늘 하루만 알람을 끕니다
              </Text>
            </View>
            <Switch
              value={activeRoute.isSkippedToday}
              onValueChange={async () => {
                setSkipLoading(true);
                try { await skipToday(); } finally { setSkipLoading(false); }
              }}
              disabled={skipLoading}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
          {activeRoute.isSkippedToday && (
            <View style={[styles.infoBanner, { marginTop: 0 }]}>
              <Ionicons name="moon-outline" size={14} color={colors.primary} />
              <Text style={styles.infoText}>오늘 출발 알람이 비활성화됐어요. 내일부터 자동으로 다시 울려요.</Text>
            </View>
          )}
        </View>
      )}

      {/* 기상 알람 — wakeUpEnabled가 null이면 루트 로드 전이므로 렌더링 생략(깜빡임 방지) */}
      {activeRoute && wakeUpEnabled !== null && (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>⏰ 기상 알람</Text>
            <Switch
              value={wakeUpEnabled}
              onValueChange={v => setWakeUpEnabled(v)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
          {today?.logDate && (
            <View style={[styles.infoBanner, { marginTop: 0, marginBottom: 8 }]}>
              <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
              <Text style={[styles.infoText, { color: '#2E7D32' }]}>오늘 알람은 이미 발송됐어요. 변경 사항은 내일부터 적용됩니다.</Text>
            </View>
          )}
          <View style={styles.alarmDiffRow}>
            <View style={styles.alarmDiffItem}>
              <Ionicons name="alarm-outline" size={15} color={colors.primary} />
              <Text style={styles.alarmDiffLabel}>기상 알람</Text>
              <Text style={styles.alarmDiffDesc}>출발 N분 전{'\n'}조용히 푸시 알림</Text>
            </View>
            <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
            <View style={styles.alarmDiffItem}>
              <Ionicons name="notifications-outline" size={15} color="#E65100" />
              <Text style={[styles.alarmDiffLabel, { color: '#E65100' }]}>출발 알람</Text>
              <Text style={styles.alarmDiffDesc}>출발 시각{'\n'}소리+진동 알람</Text>
            </View>
          </View>
          {wakeUpEnabled ? (
            <>
              <Text style={[styles.autoSaveText, { marginBottom: 12 }]}>
                출발 {wakeUpMinutes}분 전{(() => {
                  if (!displayDepartureTime) return '';
                  const [hh, mm] = displayDepartureTime.split(':').map(Number);
                  const wMin = ((hh * 60 + mm - wakeUpMinutes) % 1440 + 1440) % 1440;
                  const wh = Math.floor(wMin / 60);
                  const wm = wMin % 60;
                  const ampm = wh < 12 ? '오전' : '오후';
                  const h12 = wh % 12 === 0 ? 12 : wh % 12;
                  return ` · ${ampm} ${h12}:${String(wm).padStart(2, '0')}에 기상 알람`;
                })()}
              </Text>
              <View style={styles.bufferControls}>
                <TouchableOpacity
                  style={[styles.bufferBtn, wakeUpMinutes <= 15 && styles.bufferBtnDisabled]}
                  onPress={() => setWakeUpMinutes(m => Math.max(15, m - 15))}
                  disabled={wakeUpMinutes <= 15}
                >
                  <Ionicons name="remove" size={20} color={wakeUpMinutes <= 15 ? colors.textMuted : colors.primary} />
                </TouchableOpacity>
                <Text style={styles.bufferControlValue}>{wakeUpMinutes}분 전</Text>
                <TouchableOpacity
                  style={[styles.bufferBtn, wakeUpMinutes >= 120 && styles.bufferBtnDisabled]}
                  onPress={() => setWakeUpMinutes(m => Math.min(120, m + 15))}
                  disabled={wakeUpMinutes >= 120}
                >
                  <Ionicons name="add" size={20} color={wakeUpMinutes >= 120 ? colors.textMuted : colors.primary} />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text style={[styles.autoSaveText, { marginTop: 4 }]}>
              출발 전 미리 기상 알람을 받으려면 켜주세요
            </Text>
          )}
        </View>
      )}

      {/* 테스트 알람 */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🧪 알람 테스트</Text>
        <Text style={styles.testDesc}>설정이 올바른지 즉시 FCM 알림을 보내 확인합니다.</Text>
        <TouchableOpacity
          style={styles.testBtn}
          onPress={() =>
            sendTestAlarm()
              .then(() => Alert.alert('전송 완료', '10~30초 이내 알림이 도착합니다.\n도착하지 않으면 설정 → 알림에서 OnTime 알림이 허용되어 있는지 확인해주세요.'))
              .catch((e: any) => Alert.alert('알람 테스트 실패', e?.response?.data ?? '앱을 완전히 종료했다가 다시 열고 시도해주세요.\n문제가 계속되면 로그아웃 후 재로그인해주세요.'))
          }
        >
          <Ionicons name="notifications-outline" size={18} color="#fff" />
          <Text style={styles.testBtnText}>테스트 알람 보내기</Text>
        </TouchableOpacity>
      </View>

      {/* 사운드 설정 */}
      <View style={[styles.card, { marginBottom: 28 }]}>
        <Text style={styles.sectionTitle}>🔔 사운드 설정</Text>
        {Platform.OS === 'android' ? (
          <View style={styles.settingRow}>
            <View style={styles.settingIconWrap}>
              <Ionicons name="phone-portrait-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>진동 알림</Text>
              <Text style={styles.settingSub}>알림 수신 시 진동 활성화</Text>
            </View>
            <Switch
              value={vibration}
              onValueChange={(v) => { setVibration(v); handleSoundToggle(STORAGE_KEYS.vibration, v); }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.settingRow, { alignItems: 'flex-start' }]}
            onPress={() => Linking.openURL('app-settings:').catch(() => Linking.openSettings())}
          >
            <View style={styles.settingIconWrap}>
              <Ionicons name="settings-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>소리 · 진동 설정</Text>
              <Text style={styles.settingSub}>탭해서 iOS 설정 → OnTime으로 이동 · 소리와 진동을 변경할 수 있습니다.</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginTop: 2 }} />
          </TouchableOpacity>
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: colors.bg },
  header:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 },
  settingsBtn:         { padding: 6 },
  descBanner:          { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 20, marginBottom: 8, backgroundColor: colors.primaryLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  descBannerText:      { flex: 1, fontSize: 13, fontFamily: fonts.regular, color: colors.primary, lineHeight: 18 },
  routeInfoBanner:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 20, marginBottom: 8, backgroundColor: colors.primaryLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  routeInfoText:       { flex: 1, fontSize: 12, fontFamily: fonts.regular, color: colors.textSecondary },
  permissionBanner:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginBottom: 8, backgroundColor: '#FFEBEE', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  permissionBannerText:{ flex: 1, fontSize: 12, fontFamily: fonts.regular, color: '#D32F2F', lineHeight: 17 },
  logoImg:             { width: 180, height: 81 },
  wakeCard:            { margin: 20, backgroundColor: colors.primary, borderRadius: 16, padding: 24, alignItems: 'center' },
  wakeLabel:           { fontSize: 13, fontFamily: fonts.regular, color: 'rgba(255,255,255,0.75)', marginBottom: 4 },
  wakeTime:            { fontSize: 48, fontFamily: fonts.extraBold, color: '#fff', letterSpacing: -1 },
  wakeTimeSubLabel:    { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  wakeTimePlaceholder: { fontSize: 16, fontFamily: fonts.regular, color: 'rgba(255,255,255,0.7)', marginVertical: 12 },
  badgeRow:            { flexDirection: 'row', gap: 8, marginTop: 12 },
  badge:               { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText:           { fontSize: 12, fontFamily: fonts.regular, color: '#fff' },
  nextAlarmRow:        { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  nextAlarmRowHighlight:{ backgroundColor: 'rgba(255,255,255,0.3)' },
  nextAlarmText:       { fontSize: 13, fontFamily: fonts.semiBold, color: '#fff' },
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
  bufferBtnDisabled:   { backgroundColor: colors.border, opacity: 0.5 },
  bufferControlValue:  { fontSize: 18, fontFamily: fonts.bold, color: colors.textPrimary, minWidth: 60, textAlign: 'center' },
  settingRow:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  settingIconWrap:     { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  settingLabel:        { fontSize: 14, fontFamily: fonts.semiBold, color: colors.textPrimary },
  settingSub:          { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 2 },
  noRouteMsg:          { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center', marginTop: 10, lineHeight: 20 },
  noRouteMsgLink:      { fontSize: 13, fontFamily: fonts.semiBold, color: colors.primary, marginTop: 12 },
  inactiveRouteBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginBottom: 8, backgroundColor: '#FFF3E0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  inactiveRouteBannerText: { flex: 1, fontSize: 12, fontFamily: fonts.regular, color: '#E65100', lineHeight: 17 },
  alarmDiffRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 14, backgroundColor: colors.bg, borderRadius: 10, paddingVertical: 10 },
  alarmDiffItem:       { alignItems: 'center', gap: 3, flex: 1 },
  alarmDiffLabel:      { fontSize: 12, fontFamily: fonts.semiBold, color: colors.primary },
  alarmDiffDesc:       { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center', lineHeight: 15 },
  testDesc:            { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted, marginBottom: 12 },
  testBtn:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13 },
  testBtnText:         { color: '#fff', fontFamily: fonts.semiBold, fontSize: 14 },
});
