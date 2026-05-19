import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

const weekData = [
  { week: 'W1', rate: 60 }, { week: 'W2', rate: 75 },
  { week: 'W3', rate: 55 }, { week: 'W4', rate: 90 },
  { week: 'Today', rate: 82 },
];

const recentTrips = [
  { title: '출근 - 강남 오피스', sub: '오늘 오전 08:45 도착', status: '정시 도착', ok: true, icon: 'briefcase' },
  { title: '저녁 약속 - 이태원', sub: '이내 오후 07:05 도착 (5분 지연)', status: '지각 3m', ok: false, icon: 'restaurant' },
  { title: '헬스장 - 피트니스 센터', sub: '이내 오전 06:20 도착', status: '정시 도착', ok: true, icon: 'fitness' },
];

export default function StatsScreen() {
  const maxRate = Math.max(...weekData.map(d => d.rate));

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      <View style={styles.header}>
        <Ionicons name="airplane" size={20} color={colors.primary} />
        <Text style={styles.appName}>OnTime</Text>
      </View>

      {/* AI Insight */}
      <View style={styles.insightCard}>
        <View style={styles.insightBadge}>
          <Text style={styles.insightBadgeText}>통계 인사이트</Text>
        </View>
        <Text style={styles.insightTitle}>월요일 오전의 패턴</Text>
        <Text style={styles.insightDesc}>
          당신은 매주 월요일 평균적으로 5분 정도 늦는 경향이 있습니다.
        </Text>
        <View style={styles.insightStat}>
          <Text style={styles.insightStatValue}>82%</Text>
          <Ionicons name="trending-up" size={20} color={colors.success} />
          <Text style={styles.insightStatLabel}>이번 주 정시율</Text>
        </View>
      </View>

      {/* Weekly Chart */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📊 최근 30일 성공률</Text>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.primary }]} /><Text style={styles.legendText}>정시</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.danger }]} /><Text style={styles.legendText}>지각</Text></View>
        </View>
        <View style={styles.chartContainer}>
          {weekData.map((d, i) => (
            <View key={i} style={styles.barGroup}>
              <Text style={styles.barValue}>{d.rate}%</Text>
              <View style={styles.barBg}>
                <View style={[
                  styles.barFill,
                  { height: `${d.rate}%`, backgroundColor: d.week === 'Today' ? colors.primary : colors.primary + '60' }
                ]} />
              </View>
              <Text style={[styles.barLabel, d.week === 'Today' && { color: colors.primary, fontWeight: '700' }]}>
                {d.week}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Goal Achievement */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🎯 도착 시간 대비 목표</Text>
        <View style={styles.goalRow}>
          <View style={styles.donutWrap}>
            <View style={styles.donutOuter}>
              <View style={styles.donutInner}>
                <Text style={styles.donutValue}>80%</Text>
                <Text style={styles.donutLabel}>목표 달성</Text>
              </View>
            </View>
          </View>
          <View style={styles.goalStats}>
            <View style={styles.goalStatItem}>
              <Text style={styles.goalStatLabel}>평균 지각 시간</Text>
              <Text style={[styles.goalStatValue, { color: colors.success }]}>- 4.2분</Text>
            </View>
            <View style={[styles.goalStatItem, { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <Text style={styles.goalStatLabel}>최고 기록</Text>
              <Text style={[styles.goalStatValue, { color: colors.danger }]}>+ 12분</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Recent Trips */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>최근 여정 기록</Text>
          <TouchableOpacity><Text style={styles.seeAll}>전체 보기</Text></TouchableOpacity>
        </View>
        {recentTrips.map((trip, i) => (
          <View key={i} style={styles.tripItem}>
            <View style={styles.tripIconWrap}>
              <Ionicons name={trip.icon as any} size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tripTitle}>{trip.title}</Text>
              <Text style={styles.tripSub}>{trip.sub}</Text>
            </View>
            <View style={[styles.tripBadge, { backgroundColor: trip.ok ? colors.success + '20' : colors.danger + '20' }]}>
              <Text style={[styles.tripStatus, { color: trip.ok ? colors.success : colors.danger }]}>{trip.status}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* AI Tip */}
      <View style={[styles.tipCard, { marginBottom: 28 }]}>
        <View style={styles.tipHeader}>
          <Ionicons name="bulb-outline" size={16} color={colors.warning} />
          <Text style={styles.tipTitle}>파일럿의 팁</Text>
        </View>
        <Text style={styles.tipText}>
          월요일 아침 강남대로는 다른 평일보다 평균 12% 더 정체됩니다.
          알람을 평소보다 10분 더 일당겨보는 건 어떨까요?
        </Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.bg },
  header:         { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingTop: 52, paddingBottom: 8 },
  appName:        { fontSize: 18, fontWeight: '700', color: colors.primary },
  insightCard:    { margin: 20, backgroundColor: colors.primary, borderRadius: 16, padding: 20 },
  insightBadge:   { backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 10 },
  insightBadgeText: { fontSize: 12, color: '#fff' },
  insightTitle:   { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 6 },
  insightDesc:    { fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 20, marginBottom: 16 },
  insightStat:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12 },
  insightStatValue: { fontSize: 24, fontWeight: '800', color: '#fff' },
  insightStatLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  card:           { marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  sectionTitle:   { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  legendRow:      { flexDirection: 'row', gap: 16, marginBottom: 12 },
  legendItem:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:      { width: 8, height: 8, borderRadius: 4 },
  legendText:     { fontSize: 12, color: colors.textSecondary },
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 8, paddingTop: 8 },
  barGroup:       { flex: 1, alignItems: 'center', gap: 4 },
  barValue:       { fontSize: 10, color: colors.textMuted },
  barBg:          { flex: 1, width: '100%', backgroundColor: colors.bg, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill:        { width: '100%', borderRadius: 6 },
  barLabel:       { fontSize: 11, color: colors.textSecondary },
  goalRow:        { flexDirection: 'row', alignItems: 'center', gap: 20 },
  donutWrap:      { alignItems: 'center', justifyContent: 'center' },
  donutOuter:     { width: 110, height: 110, borderRadius: 55, borderWidth: 12, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  donutInner:     { alignItems: 'center' },
  donutValue:     { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  donutLabel:     { fontSize: 11, color: colors.textSecondary },
  goalStats:      { flex: 1, gap: 12 },
  goalStatItem:   { paddingTop: 12 },
  goalStatLabel:  { fontSize: 12, color: colors.textSecondary },
  goalStatValue:  { fontSize: 20, fontWeight: '700', marginTop: 2 },
  rowBetween:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  seeAll:         { fontSize: 13, color: colors.primary },
  tripItem:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  tripIconWrap:   { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  tripTitle:      { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  tripSub:        { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  tripBadge:      { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  tripStatus:     { fontSize: 12, fontWeight: '600' },
  tipCard:        { marginHorizontal: 20, backgroundColor: colors.warning + '15', borderRadius: 16, padding: 16 },
  tipHeader:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  tipTitle:       { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  tipText:        { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
});
