import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Image, Platform, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, cardShadow } from '../constants/colors';
import { useAppointmentStore } from '../store/appointmentStore';
import KakaoMapView from '../components/KakaoMapView';
import AddressInput from '../components/AddressInput';
import { getErrorMessage } from '../utils/errors';
import type { AppointmentRequest } from '../api/appointments';
import { DEFAULT_ALARM_MINUTES } from '../constants/defaults';
import { formatKoreanDateTime } from '../utils/timeFormat';

const logo = require('../../assets/logo.png');

// 날짜 표시 포맷
function formatDisplayDate(d: Date) {
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}
function formatDisplayTime(d: Date) {
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function toISOLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

// 웹에서 네이티브 DateTimePicker 대신 input 사용
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

export default function AppointmentScreen() {
  const insets = useSafeAreaInsets();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const [apptDate, setApptDate]       = useState<Date>(tomorrow);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [dest, setDest]               = useState('');
  const [destLat, setDestLat]         = useState<number | null>(null);
  const [destLng, setDestLng]         = useState<number | null>(null);
  const [submitting, setSubmitting]   = useState(false);

  // 웹용 날짜/시간 텍스트 상태
  const [webDate, setWebDate] = useState('');
  const [webTime, setWebTime] = useState('09:00');

  const [refreshing, setRefreshing] = useState(false);
  const { appointments, loading, fetchAppointments, addAppointment, completeDone, removeAppointment } = useAppointmentStore();
  useEffect(() => { fetchAppointments(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAppointments();
    setRefreshing(false);
  };

  const handleComplete = (id: number) => {
    Alert.alert('약속 완료', '이 약속을 완료 처리하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '완료', onPress: () => completeDone(id).catch((e: any) => Alert.alert('오류', getErrorMessage(e))) },
    ]);
  };

  const handleDelete = (id: number) => {
    Alert.alert('약속 삭제', '이 약속을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => removeAppointment(id).catch((e: any) => Alert.alert('오류', getErrorMessage(e))) },
    ]);
  };

  const getAppointmentTimeISO = (): string | null => {
    if (Platform.OS === 'web') {
      if (!webDate || !webTime) return null;
      return `${webDate}T${webTime}:00`;
    }
    return toISOLocal(apptDate);
  };

  const handleSubmit = async () => {
    if (!dest.trim()) {
      Alert.alert('목적지 주소를 입력해주세요.');
      return;
    }
    const appointmentTime = getAppointmentTimeISO();
    if (!appointmentTime) {
      Alert.alert('날짜와 시간을 입력해주세요.');
      return;
    }

    const apptData: AppointmentRequest = {
      destAddress: dest.trim(),
      destLat: destLat ?? undefined,
      destLng: destLng ?? undefined,
      appointmentTime,
      alarmBeforeMinutes: DEFAULT_ALARM_MINUTES,
    };

    setSubmitting(true);
    try {
      await addAppointment(apptData);
      setDest(''); setDestLat(null); setDestLng(null);
      setApptDate(tomorrow);
      setWebDate(''); setWebTime('09:00');
      Alert.alert('등록 완료', '약속이 추가되었습니다.');
    } catch (e: any) {
      Alert.alert('등록 실패', getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setDest(''); setDestLat(null); setDestLng(null);
    setApptDate(tomorrow);
    setWebDate(''); setWebTime('09:00');
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
    >

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Image source={logo} style={styles.logoImg} resizeMode="contain" />
      </View>

      <View style={styles.titleRow}>
        <Ionicons name="calendar" size={20} color={colors.primary} />
        <Text style={styles.pageTitle}>새로운 약속 등록</Text>
      </View>

      {/* 등록 폼 */}
      <View style={styles.card}>

        {/* 날짜/시간 선택 */}
        {Platform.OS === 'web' ? (
          // 웹: HTML input 사용
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>날짜</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.inputInner}
                  value={webDate}
                  onChangeText={setWebDate}
                  placeholder="2026-05-22"
                  placeholderTextColor={colors.textMuted}
                />
                <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
              </View>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>시간</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.inputInner}
                  value={webTime}
                  onChangeText={setWebTime}
                  placeholder="09:00"
                  placeholderTextColor={colors.textMuted}
                />
                <Ionicons name="time-outline" size={16} color={colors.textMuted} />
              </View>
            </View>
          </View>
        ) : (
          // 모바일: DateTimePicker
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>날짜</Text>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <Text style={styles.pickerText}>{formatDisplayDate(apptDate)}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>시간</Text>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowTimePicker(true)}>
                <Ionicons name="time-outline" size={16} color={colors.primary} />
                <Text style={styles.pickerText}>{formatDisplayTime(apptDate)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* DateTimePicker 모달 (모바일) */}
        {showDatePicker && DateTimePicker && (
          <DateTimePicker
            value={apptDate}
            mode="date"
            minimumDate={new Date()}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_: any, selected?: Date) => {
              setShowDatePicker(false);
              if (selected) {
                const updated = new Date(apptDate);
                updated.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
                setApptDate(updated);
              }
            }}
          />
        )}
        {showTimePicker && DateTimePicker && (
          <DateTimePicker
            value={apptDate}
            mode="time"
            is24Hour
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_: any, selected?: Date) => {
              setShowTimePicker(false);
              if (selected) {
                const updated = new Date(apptDate);
                updated.setHours(selected.getHours(), selected.getMinutes());
                setApptDate(updated);
              }
            }}
          />
        )}

        {/* 목적지 */}
        <Text style={styles.inputLabel}>목적지 주소</Text>
        <AddressInput
          value={dest}
          isSelected={destLat !== null}
          onChange={(t) => { setDest(t); setDestLat(null); setDestLng(null); }}
          onSelect={(address, lat, lng) => { setDest(address); setDestLat(lat); setDestLng(lng); }}
          placeholder="장소 또는 주소 입력"
          iconName="location-outline"
        />

        {/* 지도 미리보기 */}
        {destLat && destLng ? (
          <View style={{ marginTop: 12 }}>
            <KakaoMapView lat={destLat} lng={destLng} label={dest} height={160} />
          </View>
        ) : (
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map" size={28} color={colors.textMuted} />
            <Text style={styles.mapPlaceholderText}>주소 입력 후 🔍 를 눌러 위치를 확인하세요</Text>
          </View>
        )}

        <View style={[styles.row, { marginTop: 16, gap: 12 }]}>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleReset}>
            <Text style={styles.cancelText}>초기화</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
            {submitting
              ? <ActivityIndicator color={colors.textPrimary} />
              : <Text style={styles.submitText}>등록하기</Text>
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* 등록된 약속 목록 */}
      <View style={[styles.card, { marginBottom: 28 }]}>
        <Text style={styles.sectionTitle}>등록된 약속</Text>

        {loading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 8 }} />}
        {!loading && appointments.length === 0 && (
          <View style={styles.emptyWrap}>
            <Ionicons name="calendar-outline" size={28} color={colors.textMuted} />
            <Text style={styles.emptyText}>등록된 약속이 없습니다.</Text>
            <Text style={styles.emptySubText}>위 폼에서 약속을 추가해보세요.</Text>
          </View>
        )}

        {appointments.map((item) => {
          const timeStr = formatKoreanDateTime(item.appointmentTime);
          const dDayText = item.isDone ? '완료'
            : item.dDay === 0 ? 'D-Day'
            : item.dDay > 0  ? `D-${item.dDay}`
            : '종료';
          const statusColor = item.isDone ? colors.success
            : item.dDay < 0 ? colors.danger
            : colors.primary;

          return (
            <View key={item.id} style={styles.apptItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.apptTitle}>{item.destAddress}</Text>
                <Text style={styles.apptTime}>{timeStr}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>{dDayText}</Text>
              </View>
              {!item.isDone && (
                <TouchableOpacity style={styles.apptActionBtn} onPress={() => handleComplete(item.id)}>
                  <Ionicons name="checkmark-circle-outline" size={22} color={colors.success} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.apptActionBtn} onPress={() => handleDelete(item.id)}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: colors.bg },
  header:             { paddingHorizontal: 20, paddingBottom: 8 },
  logoImg:            { width: 180, height: 81 },
  titleRow:           { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  pageTitle:          { fontSize: 20, fontFamily: fonts.bold, color: colors.textPrimary },
  card:               { marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, ...cardShadow },
  inputLabel:         { fontSize: 12, fontFamily: fonts.semiBold, color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
  inputWrap:          { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  inputInner:         { fontSize: 14, fontFamily: fonts.regular, color: colors.textPrimary },
  pickerBtn:          { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12 },
  pickerText:         { flex: 1, fontSize: 13, fontFamily: fonts.semiBold, color: colors.textPrimary },
  locateBtn:          { padding: 4 },
  row:                { flexDirection: 'row' },
  mapPlaceholder:     { height: 120, backgroundColor: colors.bg, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 12, gap: 8, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  mapPlaceholderText: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 16 },
  cancelBtn:          { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.bg, alignItems: 'center' },
  cancelText:         { fontSize: 15, fontFamily: fonts.semiBold, color: colors.textSecondary },
  submitBtn:          { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' },
  submitText:         { fontSize: 15, fontFamily: fonts.bold, color: '#fff' },
  sectionTitle:       { fontSize: 15, fontFamily: fonts.bold, color: colors.textPrimary, marginBottom: 12 },
  emptyWrap:          { alignItems: 'center', paddingVertical: 16, gap: 6 },
  emptyText:          { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
  emptySubText:       { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
  apptItem:           { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  apptTitle:          { fontSize: 14, fontFamily: fonts.semiBold, color: colors.textPrimary },
  apptTime:           { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 2 },
  statusBadge:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText:         { fontSize: 12, fontFamily: fonts.semiBold },
  apptActionBtn:      { padding: 6, marginLeft: 2 },
});
