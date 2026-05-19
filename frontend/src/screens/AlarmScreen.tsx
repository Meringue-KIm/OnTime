import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function AlarmScreen() {
  const [activeDays, setActiveDays] = useState([1, 2, 3, 4, 5]);
  const [buffer, setBuffer] = useState(20);
  const [vibration, setVibration] = useState(true);
  const [gradualVolume, setGradualVolume] = useState(true);
  const [wakeLight, setWakeLight] = useState(false);

  const toggleDay = (i: number) =>
    setActiveDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      <View style={styles.header}>
        <Ionicons name="airplane" size={20} color={colors.primary} />
        <Text style={styles.appName}>OnTime</Text>
      </View>

      {/* Wake Time */}
      <View style={styles.wakeCard}>
        <Text style={styles.wakeLabel}>현재 설정된 기상 시간</Text>
        <Text style={styles.wakeTime}>07:30 AM</Text>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>5분 뒤 기상</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.success + '30' }]}>
            <Text style={[styles.badgeText, { color: colors.success }]}>도로 상황: 양호</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.editBtn}>
          <Text style={styles.editBtnText}>시간 수정하기</Text>
        </TouchableOpacity>
      </View>

      {/* Repeat Days */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📅 반복 일정 설정</Text>
        <View style={styles.daysRow}>
          {DAYS.map((day, i) => (
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

      {/* Smart Buffer */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>✨ 스마트 여유 시간 (Buffer)</Text>
          <View style={styles.currentBadge}>
            <Text style={styles.currentText}>현재 설정</Text>
          </View>
        </View>
        <View style={styles.bufferDisplay}>
          <Text style={styles.bufferValue}>{buffer}</Text>
          <Text style={styles.bufferUnit}>분</Text>
        </View>
        <View style={styles.sliderTrack}>
          <View style={[styles.sliderFill, { width: `${(buffer / 60) * 100}%` }]} />
          <TouchableOpacity
            style={[styles.sliderThumb, { left: `${(buffer / 60) * 100}%` }]}
          />
        </View>
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabel}>0분 (사용 안함)</Text>
          <Text style={styles.sliderLabel}>30분</Text>
          <Text style={styles.sliderLabel}>60분(최대)</Text>
        </View>
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={styles.infoText}>
            AI가 최근 길 실시간 교통량을 분석해 여유 시간을 자동으로 조정합니다.
            지각 직전 없는 아침을 설계하세요.
          </Text>
        </View>
        <View style={styles.bufferControls}>
          <TouchableOpacity style={styles.bufferBtn} onPress={() => setBuffer(b => Math.max(0, b - 5))}>
            <Ionicons name="remove" size={20} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.bufferControlValue}>{buffer}분</Text>
          <TouchableOpacity style={styles.bufferBtn} onPress={() => setBuffer(b => Math.min(60, b + 5))}>
            <Ionicons name="add" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sound Settings */}
      <View style={[styles.card, { marginBottom: 28 }]}>
        <Text style={styles.sectionTitle}>🔔 사운드 및 헬팁</Text>

        {[
          { label: '진동 알림', sub: '부드러운 기상 진동', icon: 'phone-portrait-outline', value: vibration, set: setVibration },
          { label: '점진적 음량', sub: '서서히 커지는 알람 소리', icon: 'volume-medium-outline', value: gradualVolume, set: setGradualVolume },
          { label: '기상 라이트', sub: '화면 밝기로 서서히 밝힘', icon: 'sunny-outline', value: wakeLight, set: setWakeLight },
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
              onValueChange={item.set}
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
  container:      { flex: 1, backgroundColor: colors.bg },
  header:         { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingTop: 52, paddingBottom: 8 },
  appName:        { fontSize: 18, fontWeight: '700', color: colors.primary },
  wakeCard:       { margin: 20, backgroundColor: colors.primary, borderRadius: 16, padding: 24, alignItems: 'center' },
  wakeLabel:      { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 4 },
  wakeTime:       { fontSize: 48, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  badgeRow:       { flexDirection: 'row', gap: 8, marginTop: 12 },
  badge:          { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText:      { fontSize: 12, color: '#fff' },
  editBtn:        { marginTop: 16, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10 },
  editBtnText:    { color: colors.primary, fontWeight: '700', fontSize: 14 },
  card:           { marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  sectionTitle:   { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 14 },
  rowBetween:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  daysRow:        { flexDirection: 'row', justifyContent: 'space-between' },
  dayBtn:         { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  dayBtnActive:   { backgroundColor: colors.primary },
  dayText:        { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  dayTextActive:  { color: '#fff' },
  currentBadge:   { backgroundColor: colors.primaryLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  currentText:    { fontSize: 11, color: colors.primary, fontWeight: '600' },
  bufferDisplay:  { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginBottom: 16 },
  bufferValue:    { fontSize: 48, fontWeight: '800', color: colors.textPrimary },
  bufferUnit:     { fontSize: 18, color: colors.textSecondary },
  sliderTrack:    { height: 6, backgroundColor: colors.border, borderRadius: 3, marginBottom: 6, position: 'relative' },
  sliderFill:     { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
  sliderThumb:    { position: 'absolute', top: -7, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, marginLeft: -10 },
  sliderLabels:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sliderLabel:    { fontSize: 10, color: colors.textMuted },
  infoBanner:     { flexDirection: 'row', gap: 8, backgroundColor: colors.primaryLight, borderRadius: 10, padding: 10, marginBottom: 12 },
  infoText:       { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  bufferControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  bufferBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  bufferControlValue: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, minWidth: 60, textAlign: 'center' },
  settingRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  settingIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  settingLabel:   { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  settingSub:     { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
