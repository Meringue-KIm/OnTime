import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

const TRANSPORT_MODES = [
  { key: 'car',     label: '자가용',   icon: 'car' },
  { key: 'transit', label: '대중교통', icon: 'bus' },
  { key: 'walk',    label: '도보',     icon: 'walk' },
] as const;

export default function RouteScreen() {
  const [transport, setTransport] = useState<'car' | 'transit' | 'walk'>('car');
  const [buffer, setBuffer] = useState(15);
  const [homeAddr, setHomeAddr] = useState('서울특별시 강남구 테헤란로 123');
  const [workAddr, setWorkAddr] = useState('서울특별시 종로구 세종대로 456');

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="airplane" size={20} color={colors.primary} />
        <Text style={styles.appName}>OnTime</Text>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>최적의 경로를{'\n'}설정하세요</Text>
        <Text style={styles.heroSub}>정확한 주소와 시간 목표로 맞춤 알람을 받아보세요</Text>
      </View>

      {/* Address */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📍 주소 설정</Text>

        <Text style={styles.inputLabel}>우리 집</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="home-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            value={homeAddr}
            onChangeText={setHomeAddr}
            placeholder="집 주소 입력"
          />
        </View>

        <Text style={[styles.inputLabel, { marginTop: 12 }]}>직장</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="business-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            value={workAddr}
            onChangeText={setWorkAddr}
            placeholder="직장 주소 입력"
          />
        </View>
      </View>

      {/* Transport Mode */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🚗 이동 수단</Text>
        <View style={styles.transportRow}>
          {TRANSPORT_MODES.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.transportBtn, transport === m.key && styles.transportBtnActive]}
              onPress={() => setTransport(m.key)}
            >
              <Ionicons name={m.icon as any} size={22} color={transport === m.key ? '#fff' : colors.textSecondary} />
              <Text style={[styles.transportLabel, transport === m.key && styles.transportLabelActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Arrival Time */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>⏰ 시간 목표</Text>
        <Text style={styles.inputLabel}>도착 희망 시간</Text>
        <View style={styles.timeDisplayWrap}>
          <Text style={styles.timeDisplay}>08:30</Text>
          <Text style={styles.timeAmPm}>오전</Text>
        </View>

        <Text style={[styles.inputLabel, { marginTop: 16 }]}>준비 여유 시간</Text>
        <View style={styles.bufferRow}>
          <TouchableOpacity style={styles.bufferBtn} onPress={() => setBuffer(b => Math.max(0, b - 5))}>
            <Ionicons name="remove" size={20} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.bufferValueWrap}>
            <Text style={styles.bufferValue}>{buffer}</Text>
            <Text style={styles.bufferUnit}>분</Text>
          </View>
          <TouchableOpacity style={styles.bufferBtn} onPress={() => setBuffer(b => Math.min(60, b + 5))}>
            <Ionicons name="add" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Estimated */}
      <View style={[styles.estimateCard, { marginBottom: 28 }]}>
        <Text style={styles.estimateLabel}>예상 소요 시간</Text>
        <Text style={styles.estimateTime}>42분</Text>
        <TouchableOpacity style={styles.updateBtn}>
          <Text style={styles.updateBtnText}>루트 업데이트 하기</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: colors.bg },
  header:             { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingTop: 52, paddingBottom: 8 },
  appName:            { fontSize: 18, fontWeight: '700', color: colors.primary },
  heroCard:           { margin: 20, backgroundColor: colors.primary, borderRadius: 16, padding: 24 },
  heroTitle:          { fontSize: 24, fontWeight: '800', color: '#fff', lineHeight: 32 },
  heroSub:            { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 8 },
  card:               { marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  sectionTitle:       { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 14 },
  inputLabel:         { fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
  inputWrap:          { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  input:              { flex: 1, fontSize: 14, color: colors.textPrimary },
  transportRow:       { flexDirection: 'row', gap: 10 },
  transportBtn:       { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: colors.bg, gap: 6 },
  transportBtnActive: { backgroundColor: colors.primary },
  transportLabel:     { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  transportLabelActive: { color: '#fff' },
  timeDisplayWrap:    { flexDirection: 'row', alignItems: 'baseline', gap: 8, backgroundColor: colors.bg, borderRadius: 10, padding: 14 },
  timeDisplay:        { fontSize: 32, fontWeight: '800', color: colors.textPrimary },
  timeAmPm:           { fontSize: 16, color: colors.textSecondary },
  bufferRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  bufferBtn:          { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  bufferValueWrap:    { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  bufferValue:        { fontSize: 36, fontWeight: '800', color: colors.textPrimary },
  bufferUnit:         { fontSize: 16, color: colors.textSecondary },
  estimateCard:       { marginHorizontal: 20, backgroundColor: colors.textPrimary, borderRadius: 16, padding: 24, alignItems: 'center', gap: 8 },
  estimateLabel:      { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  estimateTime:       { fontSize: 42, fontWeight: '800', color: '#fff' },
  updateBtn:          { marginTop: 8, backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14, width: '100%', alignItems: 'center' },
  updateBtnText:      { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
});
