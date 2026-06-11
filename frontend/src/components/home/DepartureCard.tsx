import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../constants/colors';
import { getWeatherNavIcon } from '../../utils/weather';
import { extractTimeHHmm } from '../../utils/timeFormat';
import type { RouteResponse } from '../../api/routes';
import type { TodayResponse } from '../../api/today';

interface Props {
  today: TodayResponse | null;
  todayLoading: boolean;
  todayError: boolean;
  cachedAt: string | null;
  cacheAgeLabel: string;
  activeRoute: RouteResponse | undefined;
  isActiveToday: boolean;
  departureLabel: string;
  departureCountdown: string | null;
  onNavigateAlarm: () => void;
  onNavigateRoute: () => void;
}

export default function DepartureCard({
  today,
  todayLoading,
  todayError,
  cachedAt,
  cacheAgeLabel,
  activeRoute,
  isActiveToday,
  departureLabel,
  departureCountdown,
  onNavigateAlarm,
  onNavigateRoute,
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{departureLabel}</Text>
      {activeRoute && today?.recommendedDeparture && (
        <Text style={styles.routeHint}>
          {activeRoute.homeAddress.split(' ').slice(0, 2).join(' ')} → {activeRoute.workAddress.split(' ').slice(0, 2).join(' ')}
        </Text>
      )}

      {todayLoading ? (
        <ActivityIndicator color="#fff" size="large" style={{ marginVertical: 8 }} />
      ) : todayError && !today?.recommendedDeparture ? (
        <View style={styles.centerWrap}>
          <Ionicons name="cloud-offline-outline" size={28} color="rgba(255,255,255,0.7)" />
          <Text style={styles.subText}>서버에 연결할 수 없습니다.{'\n'}당겨서 새로고침하거나 잠시 후 자동으로 재시도합니다.</Text>
        </View>
      ) : today?.recommendedDeparture ? (
        <>
          <Text style={styles.time}>{extractTimeHHmm(today.recommendedDeparture)}</Text>
          {departureCountdown && <Text style={styles.countdown}>{departureCountdown}</Text>}
          {todayError && cachedAt && (
            <View style={styles.offlineBadge}>
              <Ionicons name="cloud-offline-outline" size={11} color="rgba(255,255,255,0.7)" />
              <Text style={styles.offlineBadgeText}>오프라인 · {cacheAgeLabel}</Text>
            </View>
          )}
          {today.drivingMinutes !== undefined && (
            <View style={styles.breakdownRow}>
              <View style={styles.chip}>
                <Ionicons
                  name={activeRoute?.transportMode === 'transit' ? 'bus-outline' : activeRoute?.transportMode === 'walk' ? 'walk-outline' : 'car-outline'}
                  size={11} color="rgba(255,255,255,0.9)"
                />
                <Text style={styles.chipText}>이동 {today.drivingMinutes}분</Text>
              </View>
              {(today.weather?.bufferMinutes ?? 0) > 0 && (
                <>
                  <Text style={styles.plus}>+</Text>
                  <View style={styles.chip}>
                    <Ionicons name={getWeatherNavIcon(today.weather!.icon)} size={11} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.chipText}>날씨 +{today.weather!.bufferMinutes}분</Text>
                  </View>
                </>
              )}
              {(activeRoute?.alarmBeforeMinutes ?? 0) > 0 && (
                <>
                  <Text style={styles.plus}>+</Text>
                  <View style={styles.chip}>
                    <Ionicons name="alarm-outline" size={11} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.chipText}>여유 {activeRoute!.alarmBeforeMinutes}분</Text>
                  </View>
                </>
              )}
              {(today.personalBuffer ?? 0) !== 0 && (
                <>
                  <Text style={styles.plus}>+</Text>
                  <View style={styles.chip}>
                    <Ionicons name="analytics-outline" size={11} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.chipText}>
                      패턴 {(today.personalBuffer ?? 0) > 0 ? '+' : ''}{today.personalBuffer}분
                    </Text>
                  </View>
                </>
              )}
            </View>
          )}
          <View style={styles.badgeRow}>
            {today.logDate ? (
              <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.35)', marginBottom: 4 }]}>
                <Ionicons name="checkmark-circle" size={13} color="#fff" />
                <Text style={styles.badgeText}>오늘 알람 발송 완료</Text>
              </View>
            ) : (() => {
              const [hh, mm] = today.recommendedDeparture!.split(':').map(Number);
              const dep = new Date(); dep.setHours(hh, mm, 0, 0);
              const todayDow = new Date().getDay();
              const active = activeRoute?.activeDays?.split(',').map(Number).includes(todayDow) ?? false;
              if (dep > new Date() && active && !activeRoute?.isSkippedToday) {
                return (
                  <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.25)', marginBottom: 4 }]}>
                    <Ionicons name="alarm-outline" size={13} color="#fff" />
                    <Text style={styles.badgeText}>오늘 알람 예약됨</Text>
                  </View>
                );
              }
              return null;
            })()}
            <View style={styles.badge}>
              <Ionicons name="flag-outline" size={13} color="#fff" />
              <Text style={styles.badgeText}>도착 목표: {today.arrivalTime?.substring(0, 5) ?? '--:--'}</Text>
            </View>
            {today.weather && (
              <View style={[styles.badge, { marginTop: 6 }]}>
                <Ionicons name={getWeatherNavIcon(today.weather.icon)} size={13} color="#fff" />
                <Text style={styles.badgeText}>
                  {today.weather.condition} {today.weather.temperature}°C
                  {today.weather.bufferMinutes > 0 ? ` · 날씨로 +${today.weather.bufferMinutes}분 추가` : ''}
                </Text>
              </View>
            )}
          </View>
        </>
      ) : activeRoute?.isSkippedToday ? (
        <View style={styles.centerWrap}>
          <Ionicons name="moon-outline" size={28} color="rgba(255,255,255,0.7)" />
          <Text style={styles.subText}>오늘 알람 건너뛰기가 설정됐어요.{'\n'}내일부터 자동으로 다시 울려요.</Text>
        </View>
      ) : activeRoute ? (
        <View style={styles.centerWrap}>
          <Ionicons name="calendar-outline" size={28} color="rgba(255,255,255,0.7)" />
          <Text style={styles.subText}>오늘은 알람이 없는 날이에요.{'\n'}반복 요일에 오늘이 포함됐는지 확인해보세요.</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={onNavigateAlarm}>
            <Text style={styles.actionBtnText}>알람 설정 확인하기 →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.centerWrap}>
          <Ionicons name="map-outline" size={32} color="rgba(255,255,255,0.7)" />
          <Text style={styles.titleText}>아직 루트가 없어요</Text>
          <Text style={styles.subText}>집·직장 주소를 등록하면 매일 맞춤 출발 알람을 받을 수 있어요.</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={onNavigateRoute}>
            <Text style={styles.actionBtnText}>루트 설정하러 가기 →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card:         { marginHorizontal: 20, borderRadius: 20, backgroundColor: colors.primary, padding: 20, marginBottom: 16 },
  label:        { fontSize: 13, fontFamily: fonts.regular, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  routeHint:    { fontSize: 11, fontFamily: fonts.regular, color: 'rgba(255,255,255,0.6)', marginBottom: 6 },
  time:         { fontSize: 44, fontFamily: fonts.extraBold, color: '#fff', letterSpacing: -1 },
  countdown:    { fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 2, fontFamily: fonts.regular },
  offlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.2)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginTop: 6 },
  offlineBadgeText: { fontSize: 11, fontFamily: fonts.regular, color: 'rgba(255,255,255,0.7)' },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 8, marginBottom: 2 },
  chip:         { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  chipText:     { fontSize: 11, fontFamily: fonts.regular, color: 'rgba(255,255,255,0.9)' },
  plus:         { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: fonts.regular },
  badgeRow:     { marginTop: 8 },
  badge:        { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText:    { color: '#fff', fontSize: 12, fontFamily: fonts.regular },
  centerWrap:   { alignItems: 'center', gap: 8, paddingVertical: 8 },
  titleText:    { fontSize: 18, fontFamily: fonts.bold, color: '#fff' },
  subText:      { fontSize: 13, fontFamily: fonts.regular, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  actionBtn:    { marginTop: 4, backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  actionBtnText:{ fontSize: 14, fontFamily: fonts.semiBold, color: '#fff' },
});
