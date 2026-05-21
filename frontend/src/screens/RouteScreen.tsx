import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, cardShadow } from '../constants/colors';

const logo = require('../../assets/logo.png');
import { useRouteStore } from '../store/routeStore';
import type { RouteRequest } from '../api/routes';
import { BUFFER_MIN, BUFFER_MAX, BUFFER_STEP } from '../constants/defaults';
import { extractTimeHHmm } from '../utils/timeFormat';
import { getErrorMessage } from '../utils/errors';

const TRANSPORT_MODES = [
  { key: 'car',     label: '자가용',   icon: 'car' },
  { key: 'transit', label: '대중교통', icon: 'bus' },
  { key: 'walk',    label: '도보',     icon: 'walk' },
] as const;

export default function RouteScreen() {
  const [transport, setTransport] = useState<'car' | 'transit' | 'walk'>('car');
  const [buffer, setBuffer] = useState(15);
  const [homeAddr, setHomeAddr] = useState('');
  const [workAddr, setWorkAddr] = useState('');
  const [arrivalTime, setArrivalTime] = useState('09:00');
  const [saving, setSaving] = useState(false);

  const { routes, loading, fetchRoutes, saveRoute } = useRouteStore();

  useEffect(() => {
    fetchRoutes();
  }, []);

  useEffect(() => {
    const active = routes.find(r => r.isActive) ?? routes[0];
    if (active) {
      setHomeAddr(active.homeAddress);
      setWorkAddr(active.workAddress);
      setBuffer(active.alarmBeforeMinutes);
      setArrivalTime(extractTimeHHmm(active.arrivalTime));
    }
  }, [routes]);

  const handleSave = async () => {
    if (!homeAddr.trim() || !workAddr.trim()) {
      Alert.alert('집과 직장 주소를 모두 입력해주세요.');
      return;
    }
    const timeParts = arrivalTime.split(':');
    if (timeParts.length !== 2 || timeParts.some(p => isNaN(Number(p)))) {
      Alert.alert('시간 형식을 확인하세요 (HH:mm)');
      return;
    }

    const routeData: RouteRequest = {
      homeAddress: homeAddr.trim(),
      workAddress: workAddr.trim(),
      arrivalTime: `${arrivalTime}:00`,
      alarmBeforeMinutes: buffer,
    };

    setSaving(true);
    try {
      const existingRoute = routes.find(r => r.isActive) ?? routes[0];
      await saveRoute(routeData, existingRoute?.id);
      Alert.alert('저장 완료', '루트가 업데이트되었습니다.');
    } catch (e: any) {
      Alert.alert('저장 실패', getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      <View style={styles.header}>
        <Image source={logo} style={styles.logoImg} resizeMode="contain" />
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>최적의 경로를{'\n'}설정하세요</Text>
        <Text style={styles.heroSub}>정확한 주소와 시간 목표로 맞춤 알람을 받아보세요</Text>
      </View>

      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

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
        <Text style={styles.inputLabel}>도착 희망 시간 (HH:mm)</Text>
        <View style={styles.timeDisplayWrap}>
          <TextInput
            style={styles.timeDisplay}
            value={arrivalTime}
            onChangeText={setArrivalTime}
            placeholder="09:00"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />
          <Text style={styles.timeAmPm}>시 도착</Text>
        </View>

        <Text style={[styles.inputLabel, { marginTop: 16 }]}>준비 여유 시간</Text>
        <View style={styles.bufferRow}>
          <TouchableOpacity style={styles.bufferBtn} onPress={() => setBuffer(b => Math.max(BUFFER_MIN, b - BUFFER_STEP))}>
            <Ionicons name="remove" size={20} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.bufferValueWrap}>
            <Text style={styles.bufferValue}>{buffer}</Text>
            <Text style={styles.bufferUnit}>분</Text>
          </View>
          <TouchableOpacity style={styles.bufferBtn} onPress={() => setBuffer(b => Math.min(BUFFER_MAX, b + BUFFER_STEP))}>
            <Ionicons name="add" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Save */}
      <View style={[styles.estimateCard, { marginBottom: 28 }]}>
        <Text style={styles.estimateLabel}>알람 설정</Text>
        <Text style={styles.estimateTime}>{arrivalTime} 도착</Text>
        <TouchableOpacity style={styles.updateBtn} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color={colors.textPrimary} />
            : <Text style={styles.updateBtnText}>루트 업데이트 하기</Text>
          }
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: colors.bg },
  header:             { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingTop: 52, paddingBottom: 8 },
  logoImg:            { width: 180, height: 81 },
  heroCard:           { margin: 20, backgroundColor: colors.primary, borderRadius: 16, padding: 24 },
  heroTitle:          { fontSize: 24, fontWeight: '800', color: '#fff', lineHeight: 32 },
  heroSub:            { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 8 },
  loadingWrap:        { alignItems: 'center', paddingVertical: 8 },
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
  timeDisplay:        { fontSize: 32, fontWeight: '800', color: colors.textPrimary, minWidth: 100 },
  timeAmPm:           { fontSize: 16, color: colors.textSecondary },
  bufferRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  bufferBtn:          { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  bufferValueWrap:    { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  bufferValue:        { fontSize: 36, fontWeight: '800', color: colors.textPrimary },
  bufferUnit:         { fontSize: 16, color: colors.textSecondary },
  estimateCard:       { marginHorizontal: 20, backgroundColor: colors.textPrimary, borderRadius: 16, padding: 24, alignItems: 'center', gap: 8 },
  estimateLabel:      { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  estimateTime:       { fontSize: 32, fontWeight: '800', color: '#fff' },
  updateBtn:          { marginTop: 8, backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14, width: '100%', alignItems: 'center' },
  updateBtnText:      { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
});
