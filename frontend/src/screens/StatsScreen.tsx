import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Image, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const logo = require('../../assets/logo.png');
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, cardShadow } from '../constants/colors';
import { getLogs, submitFeedback, type CommuteLog } from '../api/logs';
import { formatDate } from '../utils/timeFormat';
import { extractTimeHHmm } from '../utils/timeFormat';

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const [logs, setLogs] = useState<CommuteLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = (): Promise<void> => {
    setLoadError(false);
    return getLogs()
      .then(({ data }) => setLogs(data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  };

  useEffect(() => { setLoading(true); fetchLogs(); }, []);

  useFocusEffect(useCallback(() => {
    const pending = logs
      .filter(l => l.isLate === null)
      .filter(l => {
        const daysDiff = (Date.now() - new Date(l.logDate).getTime()) / 86400000;
        return daysDiff <= 3;
      });
    if (pending.length === 0) return;
    const log = pending[0];
    const timer = setTimeout(() => {
      Alert.alert(
        '출근 결과를 알려주세요 📝',
        `${formatDate(log.logDate)} 출근은 어떠셨나요?\n기록해두면 정시율 통계가 쌓여요!`,
        [
          {
            text: '정시 도착 ✅',
            onPress: async () => {
              await submitFeedback(log.id, false);
              setLogs(prev => prev.map(l => l.id === log.id ? { ...l, isLate: false } : l));
            },
          },
          {
            text: '지각 😅',
            onPress: async () => {
              await submitFeedback(log.id, true);
              setLogs(prev => prev.map(l => l.id === log.id ? { ...l, isLate: true } : l));
            },
          },
          { text: '나중에', style: 'cancel' },
        ],
      );
    }, 500);
    return () => clearTimeout(timer);
  }, [logs]));

  const logsWithFeedback = logs.filter(l => l.isLate !== null);
  const onTimeCount     = logsWithFeedback.filter(l => l.isLate === false).length;
  const onTimeRate      = logsWithFeedback.length > 0
    ? Math.round((onTimeCount / logsWithFeedback.length) * 100)
    : 0;

  const weeklyData = buildWeeklyData(logs);
  const recentLogs = logs.slice(0, 5);

  const handleFeedback = (log: CommuteLog) => {
    if (log.isLate !== null) return;
    Alert.alert(
      '출근 결과 입력',
      `${formatDate(log.logDate)} 출근은 어떠셨나요?`,
      [
        {
          text: '정시 도착 ✅',
          onPress: async () => {
            await submitFeedback(log.id, false);
            setLogs(prev => prev.map(l => l.id === log.id ? { ...l, isLate: false } : l));
          },
        },
        {
          text: '지각 😅',
          onPress: async () => {
            await submitFeedback(log.id, true);
            setLogs(prev => prev.map(l => l.id === log.id ? { ...l, isLate: true } : l));
          },
        },
        { text: '취소', style: 'cancel' },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
        <Text style={styles.errorText}>통계를 불러오지 못했습니다.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchLogs}>
          <Text style={styles.retryBtnText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
    >

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Image source={logo} style={styles.logoImg} resizeMode="contain" />
      </View>

      {/* Insight Card */}
      <View style={styles.insightCard}>
        <View style={styles.insightBadge}>
          <Text style={styles.insightBadgeText}>통계 인사이트</Text>
        </View>
        <Text style={styles.insightTitle}>나의 정시 도착률</Text>
        <Text style={styles.insightDesc}>
          {logsWithFeedback.length > 0
            ? `총 ${logsWithFeedback.length}번의 출근 기록 중 ${onTimeCount}번 정시 도착했어요.`
            : '아직 출근 기록이 없어요. 출근 후 피드백을 남겨보세요!'}
        </Text>
        <View style={styles.insightStat}>
          <Text style={styles.insightStatValue}>{onTimeRate}%</Text>
          <Ionicons name="trending-up" size={20} color={colors.success} />
          <Text style={styles.insightStatLabel}>정시 도착률</Text>
        </View>
      </View>

      {/* Weekly Chart */}
      {weeklyData.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📊 주간 정시율</Text>
          <View style={styles.chartContainer}>
            {weeklyData.map((d, i) => (
              <View key={i} style={styles.barGroup}>
                <Text style={styles.barValue}>{d.rate}%</Text>
                <View style={styles.barBg}>
                  <View style={[
                    styles.barFill,
                    { height: `${d.rate}%`, backgroundColor: i === weeklyData.length - 1 ? colors.primary : colors.primary + '60' }
                  ]} />
                </View>
                <Text style={[styles.barLabel, i === weeklyData.length - 1 && { color: colors.primary, fontWeight: '700' }]}>
                  {d.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Goal Achievement */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🎯 목표 달성률</Text>
        <View style={styles.goalRow}>
          <View style={styles.donutWrap}>
            <View style={[styles.donutOuter, { borderColor: onTimeRate >= 80 ? colors.success : colors.primary }]}>
              <View style={styles.donutInner}>
                <Text style={styles.donutValue}>{onTimeRate}%</Text>
                <Text style={styles.donutLabel}>정시율</Text>
              </View>
            </View>
          </View>
          <View style={styles.goalStats}>
            <View style={styles.goalStatItem}>
              <Text style={styles.goalStatLabel}>정시 도착</Text>
              <Text style={[styles.goalStatValue, { color: colors.success }]}>{onTimeCount}회</Text>
            </View>
            <View style={[styles.goalStatItem, { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <Text style={styles.goalStatLabel}>지각</Text>
              <Text style={[styles.goalStatValue, { color: colors.danger }]}>
                {logsWithFeedback.length - onTimeCount}회
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Recent Logs */}
      <View style={[styles.card, { marginBottom: 28 }]}>
        <Text style={styles.sectionTitle}>최근 출근 기록</Text>
        {recentLogs.length === 0 ? (
          <Text style={styles.emptyText}>기록이 없습니다.</Text>
        ) : (
          recentLogs.map((log) => (
            <View key={log.id} style={styles.tripItem}>
              <View style={styles.tripIconWrap}>
                <Ionicons name="briefcase-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tripTitle}>{formatDate(log.logDate)}</Text>
                <Text style={styles.tripSub}>
                  추천 출발: {log.recommendedDeparture ? extractTimeHHmm(log.recommendedDeparture) : '--:--'}
                </Text>
              </View>
              {log.isLate === null ? (
                <TouchableOpacity
                  style={[styles.tripBadge, styles.feedbackBtn]}
                  onPress={() => handleFeedback(log)}
                >
                  <Ionicons name="pencil-outline" size={11} color={colors.primary} />
                  <Text style={[styles.tripStatus, { color: colors.primary }]}>입력</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.tripBadge, { backgroundColor: log.isLate ? colors.danger + '20' : colors.success + '20' }]}>
                  <Text style={[styles.tripStatus, { color: log.isLate ? colors.danger : colors.success }]}>
                    {log.isLate ? '지각' : '정시'}
                  </Text>
                </View>
              )}
            </View>
          ))
        )}
      </View>

    </ScrollView>
  );
}


function buildWeeklyData(logs: CommuteLog[]) {
  if (logs.length === 0) return [];
  const withFeedback = logs.filter(l => l.isLate !== null);
  if (withFeedback.length === 0) return [];

  const weekMap = new Map<string, { total: number; onTime: number }>();
  withFeedback.forEach(log => {
    const d    = new Date(log.logDate);
    const week = getWeekLabel(d);
    const cur  = weekMap.get(week) ?? { total: 0, onTime: 0 };
    weekMap.set(week, { total: cur.total + 1, onTime: cur.onTime + (log.isLate === false ? 1 : 0) });
  });

  return Array.from(weekMap.entries())
    .slice(-5)
    .map(([label, { total, onTime }]) => ({
      label,
      rate: total > 0 ? Math.round((onTime / total) * 100) : 0,
    }));
}

function getWeekLabel(d: Date): string {
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `W${week}`;
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.bg },
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, gap: 12 },
  errorText:        { fontSize: 14, fontFamily: fonts.regular, color: colors.textMuted },
  retryBtn:         { marginTop: 4, backgroundColor: colors.primaryLight, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  retryBtnText:     { fontSize: 14, fontFamily: fonts.semiBold, color: colors.primary },
  header:           { paddingHorizontal: 20, paddingBottom: 8 },
  logoImg:          { width: 180, height: 81 },
  insightCard:      { margin: 20, backgroundColor: colors.primary, borderRadius: 16, padding: 20 },
  insightBadge:     { backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 10 },
  insightBadgeText: { fontSize: 12, color: '#fff' },
  insightTitle:     { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 6 },
  insightDesc:      { fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 20, marginBottom: 16 },
  insightStat:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12 },
  insightStatValue: { fontSize: 24, fontWeight: '800', color: '#fff' },
  insightStatLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  card:             { marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  sectionTitle:     { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  chartContainer:   { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 8, paddingTop: 8 },
  barGroup:         { flex: 1, alignItems: 'center', gap: 4 },
  barValue:         { fontSize: 10, color: colors.textMuted },
  barBg:            { flex: 1, width: '100%', backgroundColor: colors.bg, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill:          { width: '100%', borderRadius: 6 },
  barLabel:         { fontSize: 11, color: colors.textSecondary },
  goalRow:          { flexDirection: 'row', alignItems: 'center', gap: 20 },
  donutWrap:        { alignItems: 'center', justifyContent: 'center' },
  donutOuter:       { width: 110, height: 110, borderRadius: 55, borderWidth: 12, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  donutInner:       { alignItems: 'center' },
  donutValue:       { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  donutLabel:       { fontSize: 11, color: colors.textSecondary },
  goalStats:        { flex: 1, gap: 12 },
  goalStatItem:     { paddingTop: 12 },
  goalStatLabel:    { fontSize: 12, color: colors.textSecondary },
  goalStatValue:    { fontSize: 20, fontWeight: '700', marginTop: 2 },
  emptyText:        { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 12 },
  tripItem:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  tripIconWrap:     { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  tripTitle:        { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  tripSub:          { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  tripBadge:        { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  tripStatus:       { fontSize: 12, fontWeight: '600' },
  feedbackBtn:      { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primaryLight },
});
