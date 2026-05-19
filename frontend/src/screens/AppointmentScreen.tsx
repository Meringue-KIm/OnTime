import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

export default function AppointmentScreen() {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [dest, setDest] = useState('');

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      <View style={styles.header}>
        <Ionicons name="airplane" size={20} color={colors.primary} />
        <Text style={styles.appName}>OnTime</Text>
      </View>

      <View style={styles.titleRow}>
        <Ionicons name="calendar" size={20} color={colors.primary} />
        <Text style={styles.pageTitle}>새로운 약속 등록</Text>
      </View>

      {/* Form */}
      <View style={styles.card}>
        <Text style={styles.inputLabel}>약속 제목</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="예: 팀 주간 회의"
          placeholderTextColor={colors.textMuted}
        />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>날짜</Text>
            <View style={styles.inputWrap}>
              <TextInput style={styles.inputInner} value={date} onChangeText={setDate} placeholder="mm/dd/yyyy" placeholderTextColor={colors.textMuted} />
              <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
            </View>
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>시간</Text>
            <View style={styles.inputWrap}>
              <TextInput style={styles.inputInner} value={time} onChangeText={setTime} placeholder="--:--" placeholderTextColor={colors.textMuted} />
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
            onChangeText={setDest}
            placeholder="장소 또는 주소 검색"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={[styles.row, { marginTop: 20, gap: 12 }]}>
          <TouchableOpacity style={styles.cancelBtn}>
            <Text style={styles.cancelText}>취소</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitBtn}>
            <Text style={styles.submitText}>등록하기</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Estimated Route Info */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>예상 이동 정보</Text>
          <View style={styles.realTimeBadge}>
            <Ionicons name="flash" size={11} color={colors.warning} />
            <Text style={styles.realTimeText}>실시간 최적화</Text>
          </View>
        </View>

        {/* Map placeholder */}
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map" size={32} color={colors.textMuted} />
          <Text style={styles.mapPlaceholderText}>지도 미리보기</Text>
          <View style={styles.mapLabel}>
            <Ionicons name="location" size={12} color="#fff" />
            <Text style={styles.mapLabelText}>강남역 2번 출구</Text>
          </View>
        </View>

        <View style={styles.routeInfoRow}>
          <View style={styles.routeInfoItem}>
            <Text style={styles.routeInfoValue}>35분</Text>
            <Text style={styles.routeInfoLabel}>예상 이동 시간</Text>
            <Text style={styles.routeInfoSub}>대중교통 기준</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.routeInfoItem}>
            <Text style={[styles.routeInfoValue, { color: colors.primary }]}>08:25</Text>
            <Text style={styles.routeInfoLabel}>권장 출발 시간</Text>
            <Text style={styles.routeInfoSub}>여유 5분 포함</Text>
          </View>
        </View>

        <View style={styles.warningBanner}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
          <Text style={styles.warningText}>현재 해당 구간에 약간의 지체가 있습니다. 5분 일찍 출발하는 것을 추천해드려요!</Text>
        </View>
      </View>

      {/* Existing Appointments */}
      <View style={[styles.card, { marginBottom: 28 }]}>
        <Text style={styles.sectionTitle}>등록된 약속</Text>
        {[
          { title: '저녁 약속 - 이태원', time: '이내 오후 07:05', status: '지각', statusColor: colors.danger },
          { title: '헬스장 - 피트니스센터', time: '이내 오전 06:20', status: '정시 도착', statusColor: colors.success },
        ].map((item, i) => (
          <View key={i} style={styles.apptItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.apptTitle}>{item.title}</Text>
              <Text style={styles.apptTime}>{item.time}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: item.statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: item.statusColor }]}>{item.status}</Text>
            </View>
          </View>
        ))}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.bg },
  header:           { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingTop: 52, paddingBottom: 8 },
  appName:          { fontSize: 18, fontWeight: '700', color: colors.primary },
  titleRow:         { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  pageTitle:        { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  card:             { marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  inputLabel:       { fontSize: 12, color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input:            { backgroundColor: colors.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, color: colors.textPrimary },
  inputWrap:        { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  inputInner:       { fontSize: 14, color: colors.textPrimary },
  row:              { flexDirection: 'row' },
  cancelBtn:        { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.bg, alignItems: 'center' },
  cancelText:       { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  submitBtn:        { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center' },
  submitText:       { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  sectionTitle:     { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  rowBetween:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  realTimeBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.warning + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  realTimeText:     { fontSize: 11, color: colors.warning, fontWeight: '600' },
  mapPlaceholder:   { height: 140, backgroundColor: colors.bg, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12, gap: 6, position: 'relative' },
  mapPlaceholderText: { color: colors.textMuted, fontSize: 13 },
  mapLabel:         { position: 'absolute', bottom: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.textPrimary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  mapLabelText:     { color: '#fff', fontSize: 11 },
  routeInfoRow:     { flexDirection: 'row', marginBottom: 12 },
  routeInfoItem:    { flex: 1, alignItems: 'center', gap: 2 },
  routeInfoValue:   { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
  routeInfoLabel:   { fontSize: 12, color: colors.textSecondary },
  routeInfoSub:     { fontSize: 11, color: colors.textMuted },
  divider:          { width: 1, backgroundColor: colors.border, marginVertical: 4 },
  warningBanner:    { flexDirection: 'row', gap: 8, backgroundColor: colors.warning + '15', borderRadius: 10, padding: 10 },
  warningText:      { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  apptItem:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  apptTitle:        { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  apptTime:         { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  statusBadge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText:       { fontSize: 12, fontWeight: '600' },
});
