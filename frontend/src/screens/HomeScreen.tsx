import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

const schedule = [
  { time: '09:30 AM', title: '주간 프로젝트 회의', location: '대회의실 B', icon: 'briefcase' },
  { time: '12:30 PM', title: '팀 런치',            location: '현시당 에그라나', icon: 'restaurant' },
  { time: '04:00 PM', title: '신규 파트너사 미팅', location: '강남역 근처',    icon: 'people' },
];

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Ionicons name="airplane" size={22} color={colors.primary} />
          <Text style={styles.appName}>OnTime</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>김</Text>
        </View>
      </View>

      {/* Greeting */}
      <View style={styles.greetingSection}>
        <Text style={styles.greeting}>좋은 아침이에요, 김지후님 👋</Text>
        <Text style={styles.greetingSub}>오늘도 당신의 하루는 순조롭게 예정입니다.</Text>
      </View>

      {/* Departure Card */}
      <View style={styles.departureCard}>
        <Text style={styles.departureLabel}>다음 출발 시간</Text>
        <Text style={styles.departureTime}>08:20 AM</Text>
        <View style={styles.trafficRow}>
          <View style={styles.trafficBadge}>
            <Ionicons name="car" size={13} color="#fff" />
            <Text style={styles.trafficBadgeText}>실시간 교통: 혼잡 · 22분 소요</Text>
          </View>
        </View>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: '78%' }]} />
        </View>
        <Text style={styles.progressLabel}>준비 완료까지 45분 남음 · 78%</Text>
      </View>

      {/* Weather */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.cardLabel}>날씨 · 서울</Text>
            <Text style={styles.temperature}>18°C</Text>
            <Text style={styles.weatherDesc}>쾌청하고 맑을 예정</Text>
          </View>
          <Ionicons name="sunny" size={56} color={colors.warning} />
        </View>
      </View>

      {/* Route Preview */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>경로 미리보기</Text>
        <View style={styles.routeRow}>
          <View style={styles.routePoints}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <View style={styles.routeDash} />
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
          </View>
          <View style={styles.routeTexts}>
            <Text style={styles.routeText}>집</Text>
            <Text style={[styles.routeText, { color: colors.textMuted, fontSize: 12 }]}>22분 · 12.4km</Text>
            <Text style={styles.routeText}>테헤란로 오피스</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.navBtn}>
          <Ionicons name="navigate" size={16} color="#fff" />
          <Text style={styles.navBtnText}>내비게이션 시작</Text>
        </TouchableOpacity>
      </View>

      {/* Schedule */}
      <View style={[styles.card, { marginBottom: 28 }]}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardLabel}>오늘의 일정</Text>
          <TouchableOpacity><Text style={styles.seeAll}>모두 보기</Text></TouchableOpacity>
        </View>
        {schedule.map((item, i) => (
          <View key={i} style={styles.scheduleItem}>
            <View style={styles.scheduleIconWrap}>
              <Ionicons name={item.icon as any} size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.scheduleTitle}>{item.title}</Text>
              <Text style={styles.scheduleLocation}>{item.location}</Text>
            </View>
            <Text style={styles.scheduleTime}>{item.time}</Text>
          </View>
        ))}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.bg },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 8 },
  logoRow:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  appName:        { fontSize: 18, fontWeight: '700', color: colors.primary },
  avatar:         { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText:     { color: '#fff', fontWeight: '700', fontSize: 14 },
  greetingSection:{ paddingHorizontal: 20, paddingVertical: 12 },
  greeting:       { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  greetingSub:    { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  departureCard:  { marginHorizontal: 20, borderRadius: 16, backgroundColor: colors.primary, padding: 20, marginBottom: 16 },
  departureLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  departureTime:  { fontSize: 44, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  trafficRow:     { marginTop: 8, marginBottom: 12 },
  trafficBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  trafficBadgeText: { color: '#fff', fontSize: 12 },
  progressBg:     { height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3 },
  progressFill:   { height: 6, backgroundColor: colors.accent, borderRadius: 3 },
  progressLabel:  { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 6 },
  card:           { marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardLabel:      { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 10 },
  rowBetween:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  temperature:    { fontSize: 36, fontWeight: '800', color: colors.textPrimary },
  weatherDesc:    { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  routeRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  routePoints:    { alignItems: 'center', gap: 4 },
  dot:            { width: 10, height: 10, borderRadius: 5 },
  routeDash:      { width: 2, height: 24, backgroundColor: colors.border },
  routeTexts:     { gap: 10 },
  routeText:      { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  navBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12 },
  navBtnText:     { color: '#fff', fontWeight: '600', fontSize: 14 },
  seeAll:         { fontSize: 13, color: colors.primary },
  scheduleItem:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  scheduleIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  scheduleTitle:  { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  scheduleLocation: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  scheduleTime:   { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
});
