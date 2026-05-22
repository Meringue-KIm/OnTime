import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, cardShadow } from '../constants/colors';
import { useRouteStore } from '../store/routeStore';
import type { RouteRequest, RouteResponse } from '../api/routes';
import { BUFFER_MIN, BUFFER_MAX, BUFFER_STEP } from '../constants/defaults';
import { extractTimeHHmm } from '../utils/timeFormat';
import { getErrorMessage } from '../utils/errors';
import { DAYS_OF_WEEK } from '../constants/dates';
import AddressInput from '../components/AddressInput';

const logo = require('../../assets/logo.png');

const TRANSPORT_MODES = [
  { key: 'car',     label: '자가용',   icon: 'car' },
  { key: 'transit', label: '대중교통', icon: 'bus' },
  { key: 'walk',    label: '도보',     icon: 'walk' },
] as const;

const EMPTY_FORM = {
  homeAddr: '', homeLat: undefined as number | undefined, homeLng: undefined as number | undefined,
  workAddr: '', workLat: undefined as number | undefined, workLng: undefined as number | undefined,
  arrivalTime: '09:00',
  buffer: 15,
  transport: 'car' as 'car' | 'transit' | 'walk',
  activeDays: [1, 2, 3, 4, 5],
};

export default function RouteScreen() {
  const insets = useSafeAreaInsets();
  const { routes, loading, fetchRoutes, saveRoute, activateRoute, removeRoute } = useRouteStore();

  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState<number | null>(null);
  const [saving, setSaving]         = useState(false);

  const [homeAddr, setHomeAddr]     = useState('');
  const [homeLat, setHomeLat]       = useState<number | undefined>();
  const [homeLng, setHomeLng]       = useState<number | undefined>();
  const [workAddr, setWorkAddr]     = useState('');
  const [workLat, setWorkLat]       = useState<number | undefined>();
  const [workLng, setWorkLng]       = useState<number | undefined>();
  const [arrivalTime, setArrivalTime] = useState('09:00');
  const [buffer, setBuffer]         = useState(15);
  const [transport, setTransport]   = useState<'car' | 'transit' | 'walk'>('car');
  const [activeDays, setActiveDays] = useState([1, 2, 3, 4, 5]);

  useEffect(() => { fetchRoutes(); }, []);

  const openEditForm = (route: RouteResponse) => {
    setEditingId(route.id);
    setHomeAddr(route.homeAddress);
    setHomeLat(route.homeLat ?? undefined);
    setHomeLng(route.homeLng ?? undefined);
    setWorkAddr(route.workAddress);
    setWorkLat(route.workLat ?? undefined);
    setWorkLng(route.workLng ?? undefined);
    setArrivalTime(extractTimeHHmm(route.arrivalTime));
    setBuffer(route.alarmBeforeMinutes);
    setTransport((route.transportMode as any) ?? 'car');
    setActiveDays(route.activeDays ? route.activeDays.split(',').map(Number) : [1,2,3,4,5]);
    setShowForm(true);
  };

  const openNewForm = () => {
    setEditingId(null);
    setHomeAddr(EMPTY_FORM.homeAddr);
    setHomeLat(undefined); setHomeLng(undefined);
    setWorkAddr(EMPTY_FORM.workAddr);
    setWorkLat(undefined); setWorkLng(undefined);
    setArrivalTime(EMPTY_FORM.arrivalTime);
    setBuffer(EMPTY_FORM.buffer);
    setTransport(EMPTY_FORM.transport);
    setActiveDays([...EMPTY_FORM.activeDays]);
    setShowForm(true);
  };

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
      homeAddress: homeAddr.trim(), homeLat, homeLng,
      workAddress: workAddr.trim(), workLat, workLng,
      arrivalTime: `${arrivalTime}:00`,
      alarmBeforeMinutes: buffer,
      transportMode: transport,
      activeDays: activeDays.join(','),
    };
    setSaving(true);
    try {
      await saveRoute(routeData, editingId ?? undefined);
      setShowForm(false);
      Alert.alert('저장 완료', editingId ? '루트가 수정되었습니다.' : '새 루트가 추가되었습니다.');
    } catch (e: any) {
      Alert.alert('저장 실패', getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (id: number) => {
    try { await activateRoute(id); }
    catch (e: any) { Alert.alert('활성화 실패', getErrorMessage(e)); }
  };

  const handleDelete = (id: number) => {
    Alert.alert('루트 삭제', '이 루트를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        try { await removeRoute(id); }
        catch (e: any) { Alert.alert('삭제 실패', getErrorMessage(e)); }
      }},
    ]);
  };

  const toggleDay = (i: number) =>
    setActiveDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i]);

  const sortedRoutes = [...routes].sort((a, b) => Number(b.isActive) - Number(a.isActive));

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Image source={logo} style={styles.logoImg} resizeMode="contain" />
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>최적의 경로를{'\n'}설정하세요</Text>
        <Text style={styles.heroSub}>정확한 주소와 시간 목표로 맞춤 알람을 받아보세요</Text>
      </View>

      {/* 루트 목록 */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>내 루트</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openNewForm}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addBtnText}>추가</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />}

      {!loading && routes.length === 0 && (
        <View style={styles.emptyCard}>
          <Ionicons name="map-outline" size={36} color={colors.textMuted} />
          <Text style={styles.emptyText}>등록된 루트가 없습니다</Text>
          <TouchableOpacity style={styles.emptyAddBtn} onPress={openNewForm}>
            <Text style={styles.emptyAddText}>첫 루트 추가하기</Text>
          </TouchableOpacity>
        </View>
      )}

      {sortedRoutes.map(route => (
        <View key={route.id} style={[styles.routeCard, route.isActive && styles.routeCardActive]}>
          {route.isActive && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>활성</Text>
            </View>
          )}
          <View style={styles.routeInfo}>
            <View style={styles.routeRow}>
              <Ionicons name="home-outline" size={13} color={colors.textMuted} />
              <Text style={styles.routeAddr} numberOfLines={1}>{route.homeAddress}</Text>
            </View>
            <Ionicons name="arrow-down" size={12} color={colors.textMuted} style={{ marginLeft: 2 }} />
            <View style={styles.routeRow}>
              <Ionicons name="business-outline" size={13} color={colors.textMuted} />
              <Text style={styles.routeAddr} numberOfLines={1}>{route.workAddress}</Text>
            </View>
            <Text style={styles.routeMeta}>
              {extractTimeHHmm(route.arrivalTime)} 도착 · {route.alarmBeforeMinutes}분 여유
            </Text>
          </View>
          <View style={styles.routeActions}>
            {!route.isActive && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleActivate(route.id)}>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.actionBtn} onPress={() => openEditForm(route)}>
              <Ionicons name="pencil-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(route.id)}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {/* 편집 / 추가 폼 */}
      {showForm && (
        <View style={[styles.formCard, { marginBottom: 28 }]}>
          <Text style={styles.formTitle}>{editingId ? '루트 수정' : '새 루트 추가'}</Text>

          {/* 주소 */}
          <Text style={styles.inputLabel}>🏠 집 주소</Text>
          <AddressInput
            value={homeAddr}
            onChange={(t) => { setHomeAddr(t); setHomeLat(undefined); setHomeLng(undefined); }}
            onSelect={(addr, lat, lng) => { setHomeAddr(addr); setHomeLat(lat); setHomeLng(lng); }}
            placeholder="집 주소 입력"
            iconName="home-outline"
          />

          <Text style={[styles.inputLabel, { marginTop: 12 }]}>🏢 직장 주소</Text>
          <AddressInput
            value={workAddr}
            onChange={(t) => { setWorkAddr(t); setWorkLat(undefined); setWorkLng(undefined); }}
            onSelect={(addr, lat, lng) => { setWorkAddr(addr); setWorkLat(lat); setWorkLng(lng); }}
            placeholder="직장 주소 입력"
            iconName="business-outline"
          />

          {/* 이동 수단 */}
          <Text style={[styles.inputLabel, { marginTop: 12 }]}>🚗 이동 수단</Text>
          <View style={styles.transportRow}>
            {TRANSPORT_MODES.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[styles.transportBtn, transport === m.key && styles.transportBtnActive]}
                onPress={() => setTransport(m.key)}
              >
                <Ionicons name={m.icon as any} size={20} color={transport === m.key ? '#fff' : colors.textSecondary} />
                <Text style={[styles.transportLabel, transport === m.key && styles.transportLabelActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 도착 시간 */}
          <Text style={[styles.inputLabel, { marginTop: 12 }]}>⏰ 도착 희망 시간</Text>
          <View style={styles.timeRow}>
            <TouchableOpacity style={styles.timeBtn} onPress={() => {
              const [h, m] = arrivalTime.split(':').map(Number);
              setArrivalTime(`${String(h > 0 ? h - 1 : 23).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
            }}>
              <Ionicons name="remove" size={18} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.timeValue}>{arrivalTime}</Text>
            <TouchableOpacity style={styles.timeBtn} onPress={() => {
              const [h, m] = arrivalTime.split(':').map(Number);
              setArrivalTime(`${String(h < 23 ? h + 1 : 0).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
            }}>
              <Ionicons name="add" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* 여유 시간 */}
          <Text style={[styles.inputLabel, { marginTop: 12 }]}>⏱ 여유 시간</Text>
          <View style={styles.bufferRow}>
            <TouchableOpacity style={styles.bufferBtn} onPress={() => setBuffer(b => Math.max(BUFFER_MIN, b - BUFFER_STEP))}>
              <Ionicons name="remove" size={18} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.bufferValue}>{buffer}분</Text>
            <TouchableOpacity style={styles.bufferBtn} onPress={() => setBuffer(b => Math.min(BUFFER_MAX, b + BUFFER_STEP))}>
              <Ionicons name="add" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* 반복 요일 */}
          <Text style={[styles.inputLabel, { marginTop: 12 }]}>📅 반복 요일</Text>
          <View style={styles.daysRow}>
            {DAYS_OF_WEEK.map((day, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.dayBtn, activeDays.includes(i) && styles.dayBtnActive]}
                onPress={() => toggleDay(i)}
              >
                <Text style={[styles.dayText, activeDays.includes(i) && styles.dayTextActive]}>{day}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 버튼 */}
          <View style={styles.formBtns}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>저장</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: colors.bg },
  header:               { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8 },
  logoImg:              { width: 180, height: 81 },
  heroCard:             { margin: 20, backgroundColor: colors.primary, borderRadius: 16, padding: 24 },
  heroTitle:            { fontSize: 24, fontWeight: '800', color: '#fff', lineHeight: 32 },
  heroSub:              { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 8 },
  sectionHeader:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginBottom: 8 },
  sectionLabel:         { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  addBtn:               { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  addBtnText:           { fontSize: 13, fontWeight: '600', color: '#fff' },
  emptyCard:            { marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 16, padding: 32, alignItems: 'center', gap: 10, marginBottom: 12, ...cardShadow },
  emptyText:            { fontSize: 14, color: colors.textMuted },
  emptyAddBtn:          { marginTop: 4, backgroundColor: colors.primaryLight, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  emptyAddText:         { fontSize: 14, fontWeight: '600', color: colors.primary },
  routeCard:            { marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', ...cardShadow },
  routeCardActive:      { borderWidth: 2, borderColor: colors.primary },
  activeBadge:          { position: 'absolute', top: 10, right: 10, backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  activeBadgeText:      { fontSize: 10, fontWeight: '700', color: '#fff' },
  routeInfo:            { flex: 1 },
  routeRow:             { flexDirection: 'row', alignItems: 'center', gap: 5 },
  routeAddr:            { flex: 1, fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  routeMeta:            { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  routeActions:         { flexDirection: 'row', gap: 4 },
  actionBtn:            { padding: 6 },
  formCard:             { marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 16, padding: 16, marginTop: 8, ...cardShadow },
  formTitle:            { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 16 },
  inputLabel:           { fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
  transportRow:         { flexDirection: 'row', gap: 8 },
  transportBtn:         { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: colors.bg, gap: 4 },
  transportBtnActive:   { backgroundColor: colors.primary },
  transportLabel:       { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  transportLabelActive: { color: '#fff' },
  timeRow:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  timeBtn:              { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  timeValue:            { fontSize: 28, fontWeight: '800', color: colors.textPrimary, minWidth: 80, textAlign: 'center' },
  bufferRow:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  bufferBtn:            { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  bufferValue:          { fontSize: 22, fontWeight: '700', color: colors.textPrimary, minWidth: 60, textAlign: 'center' },
  daysRow:              { flexDirection: 'row', justifyContent: 'space-between' },
  dayBtn:               { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  dayBtnActive:         { backgroundColor: colors.primary },
  dayText:              { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  dayTextActive:        { color: '#fff' },
  formBtns:             { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn:            { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.bg, alignItems: 'center' },
  cancelText:           { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  saveBtn:              { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' },
  saveBtnText:          { fontSize: 14, fontWeight: '700', color: '#fff' },
});
