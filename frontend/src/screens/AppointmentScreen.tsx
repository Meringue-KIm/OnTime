import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const logo = require('../../assets/logo.png');
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, cardShadow } from '../constants/colors';
import { useAppointmentStore } from '../store/appointmentStore';
import { geocodeAddress } from '../api/kakao';
import KakaoMapView from '../components/KakaoMapView';
import type { AppointmentRequest } from '../api/appointments';
import { DEFAULT_ALARM_MINUTES } from '../constants/defaults';
import { formatKoreanDateTime } from '../utils/timeFormat';
import { getErrorMessage } from '../utils/errors';

function parseDateTimeInput(date: string, time: string): string | null {
  const dateParts = date.split('/');
  const timeParts = time.split(':');
  if (dateParts.length !== 3 || timeParts.length !== 2) return null;
  const [month, day, year] = dateParts;
  const [hour, minute] = timeParts;
  if ([month, day, year, hour, minute].some(p => isNaN(Number(p)))) return null;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00`;
}

export default function AppointmentScreen() {
  const insets = useSafeAreaInsets();
  const [title, setTitle]   = useState('');
  const [date, setDate]     = useState('');
  const [time, setTime]     = useState('');
  const [dest, setDest]     = useState('');
  const [destLat, setDestLat] = useState<number | null>(null);
  const [destLng, setDestLng] = useState<number | null>(null);
  const [geocoding, setGeocoding]   = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { appointments, loading, fetchAppointments, addAppointment } = useAppointmentStore();

  useEffect(() => { fetchAppointments(); }, []);

  const handleGeocode = async () => {
    if (!dest.trim()) { Alert.alert('목적지 주소를 입력해주세요.'); return; }
    setGeocoding(true);
    try {
      const { data } = await geocodeAddress(dest.trim());
      setDestLat(data.lat);
      setDestLng(data.lng);
    } catch {
      Alert.alert('위치 검색 실패', '주소를 다시 확인해주세요.');
    } finally {
      setGeocoding(false);
    }
  };

  const handleSubmit = async () => {
    if (!dest.trim() || !date.trim() || !time.trim()) {
      Alert.alert('목적지, 날짜, 시간을 모두 입력해주세요.');
      return;
    }
    const appointmentTime = parseDateTimeInput(date, time);
    if (!appointmentTime) {
      Alert.alert('날짜는 mm/dd/yyyy, 시간은 HH:mm 형식으로 입력해주세요.');
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
      setTitle(''); setDate(''); setTime('');
      setDest(''); setDestLat(null); setDestLng(null);
      Alert.alert('등록 완료', '약속이 추가되었습니다.');
    } catch (e: any) {
      Alert.alert('등록 실패', getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Image source={logo} style={styles.logoImg} resizeMode="contain" />
      </View>

      <View style={styles.titleRow}>
        <Ionicons name="calendar" size={20} color={colors.primary} />
        <Text style={styles.pageTitle}>새로운 약속 등록</Text>
      </View>

      {/* Form */}
      <View style={styles.card}>
        <Text style={styles.inputLabel}>약속 제목 (메모용)</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="예: 팀 주간 회의"
          placeholderTextColor={colors.textMuted}
        />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>날짜 (mm/dd/yyyy)</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.inputInner}
                value={date}
                onChangeText={setDate}
                placeholder="05/21/2026"
                placeholderTextColor={colors.textMuted}
                keyboardType="numbers-and-punctuation"
              />
              <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
            </View>
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>시간 (HH:mm)</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.inputInner}
                value={time}
                onChangeText={setTime}
                placeholder="14:30"
                placeholderTextColor={colors.textMuted}
                keyboardType="numbers-and-punctuation"
              />
              <Ionicons name="time-outline" size={16} color={colors.textMuted} />
            </View>
          </View>
        </View>

        <Text style={styles.inputLabel}>목적지 주소</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="location-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.inputInner, { flex: 1 }]}
            value={dest}
            onChangeText={(t) => { setDest(t); setDestLat(null); setDestLng(null); }}
            placeholder="장소 또는 주소 입력"
            placeholderTextColor={colors.textMuted}
          />
          <TouchableOpacity onPress={handleGeocode} disabled={geocoding} style={styles.locateBtn}>
            {geocoding
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Ionicons name="search" size={16} color={colors.primary} />
            }
          </TouchableOpacity>
        </View>

        {/* 지도 미리보기 */}
        {destLat && destLng ? (
          <View style={{ marginTop: 12 }}>
            <KakaoMapView lat={destLat} lng={destLng} label={dest} height={160} />
          </View>
        ) : (
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map" size={28} color={colors.textMuted} />
            <Text style={styles.mapPlaceholderText}>
              주소 입력 후 🔍 를 눌러 위치를 확인하세요
            </Text>
          </View>
        )}

        <View style={[styles.row, { marginTop: 16, gap: 12 }]}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => { setTitle(''); setDate(''); setTime(''); setDest(''); setDestLat(null); setDestLng(null); }}
          >
            <Text style={styles.cancelText}>취소</Text>
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
          <Text style={styles.emptyText}>등록된 약속이 없습니다.</Text>
        )}

        {appointments.map((item) => {
          const timeStr = formatKoreanDateTime(item.appointmentTime);
          const dDayText = item.isDone
            ? '완료'
            : item.dDay === 0 ? 'D-Day'
            : item.dDay > 0  ? `D-${item.dDay}`
            : '종료';
          const statusColor = item.isDone
            ? colors.success
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
  pageTitle:          { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  card:               { marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  inputLabel:         { fontSize: 12, color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input:              { backgroundColor: colors.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, color: colors.textPrimary },
  inputWrap:          { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  inputInner:         { fontSize: 14, color: colors.textPrimary },
  locateBtn:          { padding: 4 },
  row:                { flexDirection: 'row' },
  mapPlaceholder:     { height: 120, backgroundColor: colors.bg, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 12, gap: 8, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  mapPlaceholderText: { fontSize: 12, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 16 },
  cancelBtn:          { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.bg, alignItems: 'center' },
  cancelText:         { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  submitBtn:          { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center' },
  submitText:         { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  sectionTitle:       { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  emptyText:          { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 12 },
  apptItem:           { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  apptTitle:          { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  apptTime:           { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  statusBadge:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText:         { fontSize: 12, fontWeight: '600' },
});
