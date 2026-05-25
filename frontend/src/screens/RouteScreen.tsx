import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Image, Platform, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}
import { colors, fonts, cardShadow } from '../constants/colors';
import { useRouteStore } from '../store/routeStore';
import type { RouteRequest, RouteResponse } from '../api/routes';
import { extractTimeHHmm } from '../utils/timeFormat';
import { getErrorMessage } from '../utils/errors';
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
  const navigation = useNavigation<any>();
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
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [customTravelMin, setCustomTravelMin] = useState<string>('');

  useEffect(() => { fetchRoutes(); }, []);

  useEffect(() => {
    if (!loading && routes.length === 0 && !showForm) openNewForm();
  }, [loading, routes.length]);

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
    setCustomTravelMin(route.customTravelMinutes != null ? String(route.customTravelMinutes) : '');
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
    if (!homeLat || !homeLng) {
      Alert.alert('집 주소 확인 필요', '검색 결과 목록에서 주소를 선택해주세요.\n직접 입력하면 위치를 찾을 수 없습니다.');
      return;
    }
    if (!workLat || !workLng) {
      Alert.alert('직장 주소 확인 필요', '검색 결과 목록에서 주소를 선택해주세요.\n직접 입력하면 위치를 찾을 수 없습니다.');
      return;
    }
    const timeParts = arrivalTime.split(':');
    if (timeParts.length !== 2 || timeParts.some(p => isNaN(Number(p)))) {
      Alert.alert('시간 형식을 확인하세요 (HH:mm)');
      return;
    }
    // 대중교통: 직접 입력 필수 (× 1.4 추정값은 부정확하여 잘못된 알람 유발)
    if (transport === 'transit') {
      const parsed = parseInt(customTravelMin.trim(), 10);
      if (!customTravelMin.trim() || isNaN(parsed) || parsed <= 0) {
        Alert.alert(
          '대중교통 시간을 입력해주세요',
          '자동 계산값(자동차 × 1.4)은 실제와 크게 다를 수 있어요.\n카카오맵에서 경로를 검색한 후 실제 소요 시간(분)을 입력하면 정확한 알람을 받을 수 있어요.',
          [{ text: '확인' }],
        );
        return;
      }
    }
    const parsedCustomMin = customTravelMin.trim() ? parseInt(customTravelMin.trim(), 10) : undefined;
    const routeData: RouteRequest = {
      homeAddress: homeAddr.trim(), homeLat, homeLng,
      workAddress: workAddr.trim(), workLat, workLng,
      arrivalTime: `${arrivalTime}:00`,
      alarmBeforeMinutes: buffer,
      transportMode: transport,
      activeDays: activeDays.join(','),
      customTravelMinutes: (transport === 'transit' && parsedCustomMin && !isNaN(parsedCustomMin)) ? parsedCustomMin : undefined,
    };
    setSaving(true);
    try {
      await saveRoute(routeData, editingId ?? undefined);
      setShowForm(false);
      if (editingId) {
        Alert.alert('수정 완료', '루트가 수정되었습니다.');
      } else {
        Alert.alert(
          '등록 완료 🎉',
          '루트가 저장되었습니다!\n\n다음으로 알람 탭에서 반복 요일과 여유 시간을 설정하면 매일 자동 알람이 울립니다.',
          [
            { text: '알람 설정하러 가기', onPress: () => navigation.navigate('Alarm') },
            { text: '나중에', style: 'cancel', onPress: () => navigation.navigate('Home') },
          ],
        );
      }
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
    const target = routes.find(r => r.id === id);
    Alert.alert('루트 삭제', '이 루트를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        try {
          await removeRoute(id);
          if (target?.isActive) {
            const remaining = routes.filter(r => r.id !== id);
            if (remaining.length > 0) {
              Alert.alert(
                '알람이 꺼졌어요',
                '활성 루트가 삭제되어 알람이 중단됩니다.\n다른 루트를 활성화하시겠습니까?',
                [
                  { text: '나중에', style: 'cancel' },
                  { text: '활성화', onPress: () => handleActivate(remaining[0].id) },
                ],
              );
            }
          }
        } catch (e: any) { Alert.alert('삭제 실패', getErrorMessage(e)); }
      }},
    ]);
  };

  const sortedRoutes = [...routes].sort((a, b) => Number(b.isActive) - Number(a.isActive));

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Image source={logo} style={styles.logoImg} resizeMode="contain" />
      </View>

      {loading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 40 }} />}

      {/* 루트 없음 — 폼 자동 열림 안내 */}
      {!loading && routes.length === 0 && !showForm && (
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>경로를 설정하면{'\n'}매일 알람이 울려요</Text>
          <Text style={styles.heroSub}>집·직장 주소와 도착 목표 시간을 등록해보세요</Text>
          <TouchableOpacity style={styles.heroBtn} onPress={openNewForm}>
            <Text style={styles.heroBtnText}>루트 추가하기 →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 루트 있음 */}
      {!loading && routes.length > 0 && !showForm && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>내 루트</Text>
            {routes.length < 3 ? (
              <TouchableOpacity style={styles.addBtn} onPress={openNewForm}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.addBtnText}>추가</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.routeLimitText}>최대 3개까지 등록 가능</Text>
            )}
          </View>

          {sortedRoutes.map(route => (
            <View key={route.id} style={[styles.routeCard, route.isActive && styles.routeCardActive]}>
              <View style={styles.routeCardTop}>
                <View style={styles.routeStatusRow}>
                  <TouchableOpacity
                    style={[styles.activeBadge, !route.isActive && styles.inactiveBadge]}
                    onPress={() => !route.isActive && handleActivate(route.id)}
                    disabled={route.isActive}
                  >
                    <Text style={[styles.activeBadgeText, !route.isActive && styles.inactiveBadgeText]}>
                      {route.isActive ? '● 알람 켜짐' : '○ 알람 꺼짐'}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.routeActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => openEditForm(route)}>
                      <Ionicons name="pencil-outline" size={19} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(route.id)}>
                      <Ionicons name="trash-outline" size={19} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.routeAddressBlock}>
                  <View style={styles.routeAddressRow}>
                    <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                    <Text style={styles.routeAddrText} numberOfLines={1}>{route.homeAddress}</Text>
                  </View>
                  <View style={styles.routeLineDash} />
                  <View style={styles.routeAddressRow}>
                    <View style={[styles.dot, { backgroundColor: colors.secondary }]} />
                    <Text style={styles.routeAddrText} numberOfLines={1}>{route.workAddress}</Text>
                  </View>
                </View>

                <View style={styles.routeMetaRow}>
                  <View style={styles.routeMetaChip}>
                    <Ionicons name="flag-outline" size={12} color={colors.primary} />
                    <Text style={styles.routeMetaText}>{extractTimeHHmm(route.arrivalTime)} 도착 목표</Text>
                  </View>
                  <View style={styles.routeMetaChip}>
                    <Ionicons name="alarm-outline" size={12} color={colors.primary} />
                    <Text style={styles.routeMetaText}>여유 {route.alarmBeforeMinutes}분</Text>
                  </View>
                  <View style={styles.routeMetaChip}>
                    <Ionicons
                      name={route.transportMode === 'car' ? 'car-outline' : route.transportMode === 'transit' ? 'bus-outline' : 'walk-outline'}
                      size={12} color={colors.primary}
                    />
                    <Text style={styles.routeMetaText}>
                      {route.transportMode === 'car' ? '자가용' : route.transportMode === 'transit' ? '대중교통' : '도보'}
                    </Text>
                  </View>
                </View>
                {route.activeDays && (
                  <View style={styles.routeDaysRow}>
                    {['일','월','화','수','목','금','토'].map((d, i) => {
                      const active = route.activeDays!.split(',').map(Number).includes(i);
                      return (
                        <View key={i} style={[styles.dayDot, active && styles.dayDotActive]}>
                          <Text style={[styles.dayDotText, active && styles.dayDotTextActive]}>{d}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          ))}
        </>
      )}

      {/* 편집 / 추가 폼 */}
      {showForm && (
        <View style={[styles.formCard, { marginBottom: 28 }]}>
          <Text style={styles.formTitle}>{editingId ? '루트 수정' : '새 루트 추가'}</Text>

          {/* 주소 */}
          <Text style={styles.inputLabel}>🏠 집 주소</Text>
          <AddressInput
            value={homeAddr}
            isSelected={homeLat !== undefined}
            onChange={(t) => { setHomeAddr(t); setHomeLat(undefined); setHomeLng(undefined); }}
            onSelect={(addr, lat, lng) => { setHomeAddr(addr); setHomeLat(lat); setHomeLng(lng); }}
            placeholder="집 주소 입력"
            iconName="home-outline"
          />

          <Text style={[styles.inputLabel, { marginTop: 12 }]}>🏢 직장 주소</Text>
          <AddressInput
            value={workAddr}
            isSelected={workLat !== undefined}
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
          <TouchableOpacity style={styles.timePickerBtn} onPress={() => setShowTimePicker(true)}>
            <Ionicons name="time-outline" size={18} color={colors.primary} />
            <Text style={styles.timePickerText}>{arrivalTime}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          {showTimePicker && DateTimePicker && (() => {
            const [h, m] = arrivalTime.split(':').map(Number);
            const t = new Date(); t.setHours(h, m, 0, 0);
            return (
              <DateTimePicker
                value={t}
                mode="time"
                is24Hour
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_: any, selected?: Date) => {
                  setShowTimePicker(false);
                  if (selected) {
                    setArrivalTime(
                      `${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`
                    );
                  }
                }}
              />
            );
          })()}

          {transport === 'transit' && (
            <View style={styles.transitNote}>
              <Ionicons name="warning-outline" size={16} color="#E65100" />
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={styles.transitNoteText}>
                  대중교통 시간은 자동차 기준 × 1.4 추정값이라 실제와 크게 다를 수 있어요.{'\n'}
                  정확한 시간을 아신다면 직접 입력하세요.
                </Text>
                <View style={styles.customTravelRow}>
                  <TextInput
                    style={styles.customTravelInput}
                    placeholder="예: 35"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    value={customTravelMin}
                    onChangeText={setCustomTravelMin}
                    maxLength={3}
                  />
                  <Text style={styles.customTravelUnit}>분 직접 입력 (비워두면 자동 계산)</Text>
                </View>
              </View>
            </View>
          )}
          {transport === 'walk' && (
            <View style={[styles.transitNote, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="information-circle-outline" size={14} color={colors.success} />
              <Text style={[styles.transitNoteText, { color: '#2E7D32' }]}>도보 시간은 Haversine 직선거리 기준 5km/h로 계산됩니다.</Text>
            </View>
          )}

          {/* 반복 요일 */}
          <Text style={[styles.inputLabel, { marginTop: 12 }]}>📅 알람 반복 요일</Text>
          <View style={styles.daysRow}>
            {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.dayBtn, activeDays.includes(i) && styles.dayBtnActive]}
                onPress={() => setActiveDays(prev =>
                  prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
                )}
              >
                <Text style={[styles.dayText, activeDays.includes(i) && styles.dayTextActive]}>{d}</Text>
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
  heroBtn:              { marginTop: 16, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20 },
  heroBtnText:          { fontSize: 14, fontWeight: '600', color: '#fff' },
  sectionHeader:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginBottom: 8 },
  sectionLabel:         { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  addBtn:               { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  addBtnText:           { fontSize: 13, fontWeight: '600', color: '#fff' },
  routeLimitText:       { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted },
  routeCard:            { marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, ...cardShadow },
  routeCardActive:      { borderWidth: 2, borderColor: colors.primary },
  routeCardTop:         { gap: 12 },
  routeStatusRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeBadge:          { backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  activeBadgeText:      { fontSize: 11, fontWeight: '700', color: '#fff' },
  inactiveBadge:        { backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  inactiveBadgeText:    { fontSize: 11, fontWeight: '600', color: colors.primary },
  routeActions:         { flexDirection: 'row', gap: 2 },
  actionBtn:            { padding: 7 },
  routeAddressBlock:    { backgroundColor: colors.bg, borderRadius: 10, padding: 12, gap: 6 },
  routeAddressRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot:                  { width: 8, height: 8, borderRadius: 4 },
  routeLineDash:        { width: 2, height: 14, backgroundColor: colors.border, marginLeft: 3 },
  routeAddrText:        { flex: 1, fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  routeMetaRow:         { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  routeMetaChip:        { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primaryLight, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  routeMetaText:        { fontSize: 11, fontWeight: '600', color: colors.primary },
  routeDaysRow:         { flexDirection: 'row', gap: 4, marginTop: 4 },
  dayDot:               { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  dayDotActive:         { backgroundColor: colors.primary },
  dayDotText:           { fontSize: 10, fontFamily: fonts.semiBold, color: colors.textMuted },
  dayDotTextActive:     { color: '#fff' },
  formCard:             { marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 16, padding: 16, marginTop: 8, ...cardShadow },
  formTitle:            { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 16 },
  inputLabel:           { fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
  transportRow:         { flexDirection: 'row', gap: 8 },
  transportBtn:         { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: colors.bg, gap: 4 },
  transportBtnActive:   { backgroundColor: colors.primary },
  transportLabel:       { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  transportLabelActive: { color: '#fff' },
  timeGrid:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  timeColumn:           { alignItems: 'center', gap: 4 },
  timeUnit:             { fontSize: 11, color: colors.textMuted },
  timeSep:              { fontSize: 28, fontWeight: '800', color: colors.textPrimary, marginTop: 16 },
  timeRow:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  timeBtn:              { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  timeValue:            { fontSize: 28, fontWeight: '800', color: colors.textPrimary, minWidth: 52, textAlign: 'center' },
  timePickerBtn:        { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14 },
  timePickerText:       { flex: 1, fontSize: 20, fontFamily: fonts.bold, color: colors.textPrimary },
  transitNote:          { flexDirection: 'row', gap: 6, alignItems: 'flex-start', backgroundColor: '#FFF3E0', borderRadius: 8, padding: 10, marginTop: 8 },
  transitNoteText:      { fontSize: 11, color: '#E65100', lineHeight: 16 },
  customTravelRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customTravelInput:    { width: 60, backgroundColor: '#fff', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary, borderWidth: 1, borderColor: '#E65100' },
  customTravelUnit:     { fontSize: 11, color: '#E65100', flex: 1 },
  daysRow:              { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  dayBtn:               { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  dayBtnActive:         { backgroundColor: colors.primary },
  dayText:              { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textSecondary },
  dayTextActive:        { color: '#fff' },
  formBtns:             { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn:            { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.bg, alignItems: 'center' },
  cancelText:           { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  saveBtn:              { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' },
  saveBtnText:          { fontSize: 14, fontWeight: '700', color: '#fff' },
});
