import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Image, Platform, RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, cardShadow } from '../constants/colors';
import { useAppointmentStore } from '../store/appointmentStore';
import { useFocusEffect } from '@react-navigation/native';
import KakaoMapView from '../components/KakaoMapView';
import AddressInput from '../components/AddressInput';
import { getErrorMessage } from '../utils/errors';
import type { AppointmentRequest } from '../api/appointments';
const ALARM_OPTIONS = [15, 30, 60, 90];
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

  const makeTomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; };

  const [apptDate, setApptDate]       = useState<Date>(makeTomorrow);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [title, setTitle]             = useState('');
  const [dest, setDest]               = useState('');
  const [destLat, setDestLat]         = useState<number | null>(null);
  const [destLng, setDestLng]         = useState<number | null>(null);
  const [alarmMinutes, setAlarmMinutes] = useState(30);
  const [submitting, setSubmitting]   = useState(false);

  // 웹용 날짜/시간 텍스트 상태
  const [webDate, setWebDate] = useState('');
  const [webTime, setWebTime] = useState('09:00');

  const [refreshing, setRefreshing] = useState(false);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { appointments, loading, fetchAppointments, addAppointment, updateAppointment, completeDone, removeAppointment } = useAppointmentStore();
  const expiredAlertShownRef = useRef(false);
  const lastFocusDateRef = useRef('');

  useEffect(() => { fetchAppointments(); }, []);

  // 탭 재진입 시 날짜가 바뀌었으면 D-Day 갱신
  useFocusEffect(
    React.useCallback(() => {
      const today = new Date().toISOString().slice(0, 10);
      if (lastFocusDateRef.current !== today) {
        lastFocusDateRef.current = today;
        fetchAppointments();
      }
    }, [])
  );

  // 하루 1회 — 미완료 지난 약속 일괄 완료 제안
  useEffect(() => {
    if (loading || expiredAlertShownRef.current) return;
    const expired = appointments.filter(a => !a.isDone && a.dDay < 0);
    if (expired.length === 0) return;
    expiredAlertShownRef.current = true;
    const todayStr = new Date().toISOString().slice(0, 10);
    AsyncStorage.getItem('expired_alert_date').then(last => {
      if (last === todayStr) return;
      AsyncStorage.setItem('expired_alert_date', todayStr).catch(() => {});
      Alert.alert(
        '지난 약속 정리',
        `${expired.length}건의 지난 약속이 완료 처리되지 않았어요.\n일괄 완료 처리할까요?`,
        [
          { text: '나중에', style: 'cancel' },
          { text: '완료 처리', onPress: () => Promise.all(expired.map(a => completeDone(a.id))).catch(() => {}) },
        ],
      );
    });
  }, [loading]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAppointments();
    setRefreshing(false);
  };

  const openEdit = (item: import('../api/appointments').AppointmentResponse) => {
    setEditingId(item.id);
    setTitle(item.title ?? '');
    setDest(item.destAddress);
    setDestLat(item.destLat ?? null);
    setDestLng(item.destLng ?? null);
    setAlarmMinutes(item.alarmBeforeMinutes);
    const d = new Date(item.appointmentTime);
    setApptDate(d);
    if (Platform.OS === 'web') {
      const pad = (n: number) => String(n).padStart(2, '0');
      setWebDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      setWebTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    }
    setShowForm(true);
  };

  const handleComplete = (id: number) => {
    if (completingId !== null) return;
    setCompletingId(id);
    completeDone(id)
      .catch((e: any) => Alert.alert('오류', getErrorMessage(e)))
      .finally(() => setCompletingId(null));
  };

  const handleDelete = (id: number, onSuccess?: () => void) => {
    Alert.alert('약속 삭제', '삭제하면 기록이 완전히 사라집니다.\n(완료 처리와 달리 복구 불가)', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () =>
        removeAppointment(id).then(() => onSuccess?.()).catch((e: any) => Alert.alert('오류', getErrorMessage(e))) },
    ]);
  };

  const getAppointmentTimeISO = (): string | null => {
    if (Platform.OS === 'web') {
      if (!webDate || !webTime) return null;
      return `${webDate}T${webTime}:00`;
    }
    return toISOLocal(apptDate);
  };

  const doSubmit = async (apptData: AppointmentRequest): Promise<boolean> => {
    setSubmitting(true);
    const isEditing = editingId !== null;
    try {
      if (isEditing) {
        await updateAppointment(editingId!, apptData);
      } else {
        await addAppointment(apptData);
      }
      setTitle('');
      setDest(''); setDestLat(null); setDestLng(null);
      const fresh = new Date(); fresh.setDate(fresh.getDate() + 1); fresh.setHours(9, 0, 0, 0);
      setApptDate(fresh);
      setWebDate(''); setWebTime('09:00');
      setAlarmMinutes(30);
      setEditingId(null);
      setShowForm(false);
      return true;
    } catch (e: any) {
      Alert.alert(isEditing ? '수정 실패' : '등록 실패', getErrorMessage(e));
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (): Promise<boolean> => {
    if (!dest.trim()) {
      Alert.alert('목적지 주소를 입력해주세요.');
      return false;
    }
    if (!destLat || !destLng) {
      Alert.alert('목적지 주소 확인 필요', '검색 결과 목록에서 주소를 선택해주세요.\n직접 입력하면 이동 시간을 계산할 수 없습니다.');
      return false;
    }
    const appointmentTime = getAppointmentTimeISO();
    if (!appointmentTime) {
      Alert.alert('날짜와 시간을 입력해주세요.');
      return false;
    }
    if (Platform.OS === 'web') {
      const parsed = new Date(appointmentTime);
      if (isNaN(parsed.getTime())) {
        Alert.alert('날짜/시간 형식 오류', '날짜는 YYYY-MM-DD, 시간은 HH:MM 형식으로 입력해주세요.\n예) 2026-05-22 / 09:00');
        return false;
      }
    }

    const apptData: AppointmentRequest = {
      title: title.trim() || undefined,
      destAddress: dest.trim(),
      destLat: destLat ?? undefined,
      destLng: destLng ?? undefined,
      appointmentTime,
      alarmBeforeMinutes: alarmMinutes,
    };

    // 여유 시간 기준 알람 시각이 이미 지난 경우 경고
    const alarmMs = new Date(appointmentTime).getTime() - alarmMinutes * 60 * 1000;
    if (alarmMs <= Date.now()) {
      const isEditing = editingId !== null;
      return new Promise(resolve => {
        Alert.alert(
          '알람이 오지 않을 수 있어요',
          `여유 시간(${alarmMinutes}분) 기준 알람 시각이 이미 지났습니다.\n그래도 ${isEditing ? '수정' : '등록'}하시겠습니까?`,
          [
            { text: '취소', style: 'cancel', onPress: () => resolve(false) },
            { text: isEditing ? '수정' : '등록', onPress: () => doSubmit(apptData).then(resolve) },
          ],
        );
      });
    }

    return doSubmit(apptData);
  };

  const handleReset = () => {
    setEditingId(null);
    setTitle('');
    setDest(''); setDestLat(null); setDestLng(null);
    setApptDate(makeTomorrow());
    setWebDate(''); setWebTime('09:00');
    setAlarmMinutes(30);
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

      <View style={styles.descBanner}>
        <Ionicons name="calendar-outline" size={16} color={colors.primary} />
        <Text style={styles.descBannerText}>약속 장소와 시간을 등록하면 출발 시간을 자동 계산해 미리 알람이 울려요.</Text>
      </View>

      {/* 목록 먼저 */}
      <View style={[styles.card, { marginTop: 4 }]}>
        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>등록된 약속</Text>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setShowDone(v => !v)} style={styles.toggleBtnWrap}>
              <Ionicons name={showDone ? 'eye-off-outline' : 'eye-outline'} size={13} color={colors.primary} />
              <Text style={styles.toggleBtn}>{showDone ? '예정만 보기' : '완료 포함 보기'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addApptBtn} onPress={() => { setShowForm(v => !v); setEditingId(null); }}>
              <Ionicons name={showForm ? 'remove' : 'add'} size={16} color="#fff" />
              <Text style={styles.addApptBtnText}>{showForm ? '닫기' : '새 약속'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 8 }} />}
        {!loading && appointments.length === 0 && (
          <View style={styles.emptyWrap}>
            <Ionicons name="calendar-outline" size={28} color={colors.textMuted} />
            <Text style={styles.emptyText}>등록된 약속이 없습니다.</Text>
            <Text style={styles.emptySubText}>위 + 버튼으로 약속을 추가해보세요.</Text>
          </View>
        )}

        {(() => {
          const renderItem = (item: import('../api/appointments').AppointmentResponse) => {
            const timeStr = formatKoreanDateTime(item.appointmentTime);
            const isPastToday = item.dDay === 0 && !item.isDone && new Date(item.appointmentTime) <= new Date();
            const dDayText = item.isDone ? '완료'
              : (item.dDay < 0 || isPastToday) ? '종료'
              : item.dDay === 0 ? 'D-Day'
              : `D-${item.dDay}`;
            const statusColor = item.isDone ? colors.success
              : (item.dDay < 0 || isPastToday) ? colors.danger
              : colors.primary;
            const alarmMs = new Date(item.appointmentTime).getTime() - item.alarmBeforeMinutes * 60000;
            const alarmLabel = (() => {
              if (item.isDone || alarmMs <= Date.now()) return null;
              const d = new Date(alarmMs);
              return `알람 ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
            })();
            return (
              <View key={item.id} style={styles.apptItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.apptTitle}>{item.title || item.destAddress}</Text>
                  {item.title ? <Text style={styles.apptAddr} numberOfLines={1}>{item.destAddress}</Text> : null}
                  <Text style={styles.apptTime}>{timeStr}</Text>
                  {alarmLabel && <Text style={styles.apptAlarmHint}>{alarmLabel}</Text>}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>{dDayText}</Text>
                </View>
                {!item.isDone && (
                  <TouchableOpacity style={styles.apptActionBtn} onPress={() => openEdit(item)}>
                    <Ionicons name="pencil-outline" size={19} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
                {!item.isDone && (
                  <TouchableOpacity
                    style={styles.apptActionBtn}
                    onPress={() => handleComplete(item.id)}
                    disabled={completingId === item.id}
                  >
                    {completingId === item.id
                      ? <ActivityIndicator size="small" color={colors.success} />
                      : <Ionicons name="checkmark-circle-outline" size={22} color={colors.success} />}
                  </TouchableOpacity>
                )}
                {item.isDone && (
                  <TouchableOpacity style={styles.apptActionBtn} onPress={() => handleDelete(item.id)}>
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
            );
          };

          const isExpired = (a: import('../api/appointments').AppointmentResponse) =>
            a.dDay === 0 && !a.isDone && new Date(a.appointmentTime) <= new Date();
          const activeItems = appointments.filter(a => !a.isDone && a.dDay >= 0 && !isExpired(a));
          const doneItems   = appointments.filter(a => a.isDone || a.dDay < 0 || isExpired(a));

          if (!showDone) {
            if (activeItems.length === 0 && doneItems.length > 0) {
              return (
                <View style={styles.emptyWrap}>
                  <Ionicons name="checkmark-circle-outline" size={28} color={colors.textMuted} />
                  <Text style={styles.emptyText}>예정된 약속이 없습니다.</Text>
                  <Text style={styles.emptySubText}>완료 포함 보기를 누르면 이전 약속 {doneItems.length}건을 볼 수 있어요.</Text>
                </View>
              );
            }
            return activeItems.map(renderItem);
          }

          return (
            <>
              {activeItems.map(renderItem)}
              {doneItems.length > 0 && (
                <>
                  <View style={styles.doneSectionDivider}>
                    <Text style={styles.doneSectionLabel}>완료 / 종료</Text>
                  </View>
                  {doneItems.map(renderItem)}
                </>
              )}
            </>
          );
        })()}
      </View>

      {/* 등록/수정 폼 (접기/펼치기) */}
      {showForm && <View style={styles.card}>
        <Text style={styles.formTitle}>{editingId !== null ? '약속 수정' : '새 약속 등록'}</Text>

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

        {/* 약속 제목 */}
        <Text style={styles.inputLabel}>약속 이름 (선택)</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.inputInner}
            placeholder="예: 팀 회식, 친구 생일"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={30}
          />
        </View>

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

        {/* 알람 시간 설정 */}
        <Text style={styles.inputLabel}>약속 몇 분 전에 알람</Text>
        <View style={styles.alarmOptionsRow}>
          {ALARM_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[styles.alarmOption, alarmMinutes === opt && styles.alarmOptionActive]}
              onPress={() => setAlarmMinutes(opt)}
            >
              <Text style={[styles.alarmOptionText, alarmMinutes === opt && styles.alarmOptionTextActive]}>
                {opt}분 전
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {(() => {
          let baseMs: number | null = null;
          if (Platform.OS === 'web') {
            if (webDate && webTime) {
              const d = new Date(`${webDate}T${webTime}:00`);
              if (!isNaN(d.getTime())) baseMs = d.getTime() - alarmMinutes * 60000;
            }
          } else {
            baseMs = apptDate.getTime() - alarmMinutes * 60000;
          }
          if (baseMs && baseMs > Date.now()) {
            const d = new Date(baseMs);
            const hh = d.getHours(), mm = d.getMinutes();
            const ampm = hh < 12 ? '오전' : '오후';
            const h12 = hh % 12 === 0 ? 12 : hh % 12;
            const timeStr = `${ampm} ${h12}:${String(mm).padStart(2, '0')}`;
            return (
              <View style={styles.alarmPreview}>
                <Ionicons name="alarm-outline" size={14} color={colors.primary} />
                <Text style={styles.alarmPreviewText}>
                  최소 <Text style={{ fontFamily: fonts.bold, color: colors.primary }}>{timeStr}</Text> 이전에 알람이 울려요
                  <Text style={{ color: colors.textMuted }}> (이동 시간 포함 시 더 일찍)</Text>
                </Text>
              </View>
            );
          }
          return null;
        })()}
        <View style={styles.alarmNote}>
          <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} />
          <Text style={styles.alarmNoteText}>집에서 목적지까지 이동 시간이 자동 합산돼 출발 알람이 울립니다.</Text>
        </View>

        {/* 지도 미리보기 */}
        {destLat && destLng ? (
          <View style={{ marginTop: 12 }}>
            <KakaoMapView lat={destLat} lng={destLng} label={dest} height={160} />
          </View>
        ) : (
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map" size={28} color={colors.textMuted} />
            <Text style={styles.mapPlaceholderText}>검색 결과에서 주소를 선택하면 지도가 표시됩니다</Text>
          </View>
        )}

        {editingId !== null && (
          <TouchableOpacity
            style={styles.deleteInFormBtn}
            onPress={() => handleDelete(editingId, () => { setShowForm(false); setEditingId(null); })}
          >
            <Ionicons name="trash-outline" size={14} color={colors.danger} />
            <Text style={styles.deleteInFormBtnText}>약속 삭제</Text>
          </TouchableOpacity>
        )}
        <View style={[styles.row, { marginTop: 12, gap: 12 }]}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => { handleReset(); setShowForm(false); }}>
            <Text style={styles.cancelText}>취소</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitBtn} onPress={async () => { const ok = await handleSubmit(); if (ok) setShowForm(false); }} disabled={submitting}>
            {submitting
              ? <ActivityIndicator color={colors.textPrimary} />
              : <Text style={styles.submitText}>{editingId !== null ? '수정하기' : '등록하기'}</Text>
            }
          </TouchableOpacity>
        </View>
      </View>}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: colors.bg },
  header:             { paddingHorizontal: 20, paddingBottom: 8 },
  logoImg:            { width: 180, height: 81 },
  descBanner:         { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 20, marginBottom: 8, backgroundColor: colors.primaryLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  descBannerText:     { flex: 1, fontSize: 13, fontFamily: fonts.regular, color: colors.primary, lineHeight: 18 },
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
  listHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:       { fontSize: 15, fontFamily: fonts.bold, color: colors.textPrimary },
  toggleBtnWrap:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  toggleBtn:          { fontSize: 12, fontFamily: fonts.semiBold, color: colors.primary },
  emptyWrap:          { alignItems: 'center', paddingVertical: 16, gap: 6 },
  emptyText:          { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
  emptySubText:       { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
  apptItem:           { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  apptTitle:          { fontSize: 14, fontFamily: fonts.semiBold, color: colors.textPrimary },
  apptAddr:           { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 1 },
  apptTime:           { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 2 },
  apptAlarmHint:      { fontSize: 11, fontFamily: fonts.regular, color: colors.primary, marginTop: 2 },
  doneSectionDivider: { paddingTop: 14, paddingBottom: 6, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4 },
  doneSectionLabel:   { fontSize: 11, fontFamily: fonts.semiBold, color: colors.textMuted },
  statusBadge:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText:         { fontSize: 12, fontFamily: fonts.semiBold },
  apptActionBtn:      { padding: 6, marginLeft: 2 },
  alarmOptionsRow:    { flexDirection: 'row', gap: 8 },
  alarmOption:        { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: colors.bg, alignItems: 'center' },
  alarmOptionActive:  { backgroundColor: colors.primary },
  alarmOptionText:    { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textSecondary },
  alarmOptionTextActive: { color: '#fff' },
  alarmPreview:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: colors.primaryLight, borderRadius: 8, padding: 9 },
  alarmPreviewText:   { flex: 1, fontSize: 12, fontFamily: fonts.regular, color: colors.textSecondary, lineHeight: 17 },
  alarmNote:          { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 6 },
  alarmNoteText:      { flex: 1, fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted, lineHeight: 16 },
  addApptBtn:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  addApptBtnText:     { fontSize: 13, fontFamily: fonts.semiBold, color: '#fff' },
  formTitle:          { fontSize: 15, fontFamily: fonts.bold, color: colors.textPrimary, marginBottom: 4 },
  deleteInFormBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: colors.danger + '50', backgroundColor: colors.danger + '0D' },
  deleteInFormBtnText:{ fontSize: 13, fontFamily: fonts.semiBold, color: colors.danger },
});
