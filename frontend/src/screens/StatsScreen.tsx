import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Image, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const logo = require('../../assets/logo.png');
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, cardShadow } from '../constants/colors';
import { getLogs, submitFeedback, type CommuteLog } from '../api/logs';
import { formatDate } from '../utils/timeFormat';
import { extractTimeHHmm } from '../utils/timeFormat';

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
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

  // 로드 실패 시 5초 후 자동 재시도
  useEffect(() => {
    if (!loadError) return;
    const timer = setTimeout(fetchLogs, 5000);
    return () => clearTimeout(timer);
  }, [loadError]);

  // 최근 3일 내 피드백 미입력 로그
  const pendingFeedbackLog = logs
    .find(l => l.actualDiffMinutes === null && (Date.now() - new Date(l.logDate).getTime()) / 86400000 <= 3);

  const logsWithFeedback = logs.filter(l => l.actualDiffMinutes !== null);
  const onTimeCount     = logsWithFeedback.filter(l => l.isLate === false).length;
  const onTimeRate      = logsWithFeedback.length > 0
    ? Math.round((onTimeCount / logsWithFeedback.length) * 100)
    : 0;

  const [showAllLogs, setShowAllLogs] = useState(false);
  const weeklyData = buildWeeklyData(logs);
  const recentLogs = showAllLogs ? logs : logs.slice(0, 5);

  const doSubmitFeedback = async (log: CommuteLog, diffMinutes: number) => {
    try {
      await submitFeedback(log.id, diffMinutes);
      setLogs(prev => prev.map(l =>
        l.id === log.id ? { ...l, isLate: diffMinutes > 0, actualDiffMinutes: diffMinutes } : l
      ));
    } catch { Alert.alert('오류', '저장에 실패했습니다. 다시 시도해주세요.'); }
  };

  const handleFeedback = (log: CommuteLog) => {
    if (log.actualDiffMinutes !== null) return;
    Alert.alert(
      '출근 결과 입력',
      `${formatDate(log.logDate)}\n도착 목표 시간 기준으로 어떠셨나요?`,
      [
        { text: '15분+ 일찍', onPress: () => doSubmitFeedback(log, -15) },
        { text: '5분 일찍',   onPress: () => doSubmitFeedback(log, -5) },
        { text: '딱 맞게',    onPress: () => doSubmitFeedback(log, 0) },
        { text: '5~10분 늦음', onPress: () => doSubmitFeedback(log, 7) },
        { text: '15분+ 늦음', onPress: () => doSubmitFeedback(log, 20) },
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

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
    >

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Image source={logo} style={styles.logoImg} resizeMode="contain" />
      </View>

      {loadError && (
        <View style={styles.errorInline}>
          <Ionicons name="cloud-offline-outline" size={36} color={colors.textMuted} />
          <Text style={styles.errorText}>서버에 연결할 수 없습니다.</Text>
          <Text style={[styles.errorText, { fontSize: 12 }]}>당겨서 새로고침하거나 잠시 후 자동으로 재시도합니다.</Text>
        </View>
      )}

      {!loadError && (
      <>
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
          <Ionicons
            name={onTimeRate >= 50 ? 'trending-up' : 'trending-down'}
            size={20}
            color={onTimeRate >= 80 ? colors.success : onTimeRate >= 50 ? '#FFA000' : colors.danger}
          />
          <Text style={styles.insightStatLabel}>정시 도착률</Text>
        </View>
      </View>

      {/* 알람 조정 제안 — 5회 이상 기록에서 정시율 60% 미만 */}
      {logsWithFeedback.length >= 5 && onTimeRate < 60 && (
        <View style={styles.suggestionCard}>
          <View style={styles.suggestionTop}>
            <Ionicons name="bulb-outline" size={18} color="#E65100" />
            <Text style={styles.suggestionTitle}>알람 조정을 추천해요</Text>
          </View>
          <Text style={styles.suggestionText}>
            최근 정시 도착률이 {onTimeRate}%예요. 여유 시간을 5분 더 늘리면 지각을 줄일 수 있어요.
          </Text>
          <TouchableOpacity style={styles.suggestionBtn} onPress={() => navigation.navigate('Alarm')}>
            <Text style={styles.suggestionBtnText}>여유 시간 조정하기 →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 피드백 미입력 배너 */}
      {pendingFeedbackLog && (
        <View style={styles.feedbackBanner}>
          <Ionicons name="pencil-outline" size={16} color={colors.primary} />
          <Text style={styles.feedbackBannerText}>
            {formatDate(pendingFeedbackLog.logDate)} 출근 결과를 입력해주세요
          </Text>
          <View style={styles.feedbackBannerBtns}>
            <TouchableOpacity style={styles.feedbackBannerBtn} onPress={() => doSubmitFeedback(pendingFeedbackLog, 0)}>
              <Text style={styles.feedbackBannerBtnText}>정시 ✅</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.feedbackBannerBtn} onPress={() => doSubmitFeedback(pendingFeedbackLog, 20)}>
              <Text style={styles.feedbackBannerBtnText}>지각 😅</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.feedbackBannerBtn, { backgroundColor: colors.primaryLight }]} onPress={() => handleFeedback(pendingFeedbackLog)}>
              <Text style={[styles.feedbackBannerBtnText, { color: colors.primary }]}>세부 입력</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
                <Text style={styles.barCount}>{d.total}일</Text>
              </View>
            ))}

          </View>
          <Text style={styles.chartNote}>* 피드백을 입력한 날만 집계됩니다</Text>
        </View>
      )}

      {/* Goal Achievement */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🎯 목표 달성률</Text>
        {logsWithFeedback.length === 0 ? (
          <View style={styles.emptyGoalWrap}>
            <Ionicons name="analytics-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyGoalText}>출근 후 결과를 입력하면{'\n'}달성률이 표시됩니다.</Text>
          </View>
        ) : (
          <View style={styles.goalRow}>
            {/* 프로그레스 바 */}
            <View style={styles.progressWrap}>
              <Text style={[styles.progressValue, { color: onTimeRate >= 80 ? colors.success : onTimeRate >= 50 ? '#FFA000' : colors.danger }]}>
                {onTimeRate}%
              </Text>
              <Text style={styles.progressLabel}>정시율</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, {
                  width: `${onTimeRate}%`,
                  backgroundColor: onTimeRate >= 80 ? colors.success : onTimeRate >= 50 ? '#FFA000' : colors.danger,
                }]} />
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
        )}
      </View>

      {/* Recent Logs */}
      <View style={[styles.card, { marginBottom: 28 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>최근 출근 기록</Text>
          {logs.length > 5 && (
            <TouchableOpacity onPress={() => setShowAllLogs(v => !v)}>
              <Text style={{ fontSize: 12, color: colors.primary, fontFamily: fonts.semiBold }}>
                {showAllLogs ? '접기' : `전체 보기 (${logs.length}건)`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
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
      </>
      )}

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
      total,
      rate: total > 0 ? Math.round((onTime / total) * 100) : 0,
    }));
}

function getWeekLabel(d: Date): string {
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${mon.getMonth() + 1}/${mon.getDate()}`;
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.bg },
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, gap: 12 },
  errorInline:      { alignItems: 'center', paddingVertical: 48, gap: 8, marginHorizontal: 20 },
  errorText:        { fontSize: 14, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
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
  suggestionCard:    { marginHorizontal: 20, marginBottom: 12, backgroundColor: '#FFF3E0', borderRadius: 12, padding: 14, gap: 8, borderLeftWidth: 3, borderLeftColor: '#E65100' },
  suggestionTop:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  suggestionTitle:   { fontSize: 14, fontFamily: fonts.bold, color: '#E65100' },
  suggestionText:    { fontSize: 13, fontFamily: fonts.regular, color: '#5D4037', lineHeight: 18 },
  suggestionBtn:     { alignSelf: 'flex-start', backgroundColor: '#E65100', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  suggestionBtnText: { fontSize: 13, fontFamily: fonts.semiBold, color: '#fff' },
  feedbackBanner:       { marginHorizontal: 20, marginBottom: 12, backgroundColor: colors.primaryLight, borderRadius: 12, padding: 12, gap: 8 },
  feedbackBannerText:   { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textPrimary, flex: 1 },
  feedbackBannerBtns:   { flexDirection: 'row', gap: 8 },
  feedbackBannerBtn:    { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center' },
  feedbackBannerBtnText:{ fontSize: 13, fontFamily: fonts.semiBold, color: '#fff' },
  card:             { marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  sectionTitle:     { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  chartContainer:   { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 8, paddingTop: 8 },
  barGroup:         { flex: 1, alignItems: 'center', gap: 4 },
  barValue:         { fontSize: 10, color: colors.textMuted },
  barBg:            { flex: 1, width: '100%', backgroundColor: colors.bg, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill:          { width: '100%', borderRadius: 6 },
  barLabel:         { fontSize: 11, color: colors.textSecondary },
  barCount:         { fontSize: 9, color: colors.textMuted },
  chartNote:        { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 8, textAlign: 'right' },
  goalRow:          { flexDirection: 'row', alignItems: 'center', gap: 20 },
  progressWrap:     { alignItems: 'center', width: 110 },
  progressValue:    { fontSize: 36, fontWeight: '800' },
  progressLabel:    { fontSize: 11, color: colors.textSecondary, marginBottom: 8 },
  progressBarBg:    { width: '100%', height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  progressBarFill:  { height: '100%', borderRadius: 4 },
  goalStats:        { flex: 1, gap: 12 },
  goalStatItem:     { paddingTop: 12 },
  goalStatLabel:    { fontSize: 12, color: colors.textSecondary },
  goalStatValue:    { fontSize: 20, fontWeight: '700', marginTop: 2 },
  emptyText:        { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 12 },
  emptyGoalWrap:    { alignItems: 'center', paddingVertical: 20, gap: 10 },
  emptyGoalText:    { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  tripItem:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  tripIconWrap:     { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  tripTitle:        { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  tripSub:          { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  tripBadge:        { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  tripStatus:       { fontSize: 12, fontWeight: '600' },
  feedbackBtn:      { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primaryLight },
});
