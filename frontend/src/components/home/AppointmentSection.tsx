import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, cardShadow } from '../../constants/colors';
import { formatApptTime, formatKoreanDateTime } from '../../utils/timeFormat';
import type { AppointmentResponse } from '../../api/appointments';

interface Props {
  todayAppts: AppointmentResponse[];
  nextAppt: AppointmentResponse | undefined;
  upcomingCount: number;
  onNavigate: () => void;
}

export default function AppointmentSection({ todayAppts, nextAppt, upcomingCount, onNavigate }: Props) {
  return (
    <View style={[styles.card, { marginBottom: 28 }]}>
      <View style={styles.header}>
        <Text style={styles.label}>오늘 약속</Text>
        <TouchableOpacity onPress={onNavigate} style={styles.moreBtn}>
          {upcomingCount > 0 && <Text style={styles.moreCount}>전체 {upcomingCount}건</Text>}
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {todayAppts.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>오늘 예정된 약속이 없습니다.</Text>
          {nextAppt ? (
            <Text style={styles.nextHint}>
              D-{nextAppt.dDay} · {formatKoreanDateTime(nextAppt.appointmentTime)} · {nextAppt.title || nextAppt.destAddress}
            </Text>
          ) : (
            <TouchableOpacity onPress={onNavigate}>
              <Text style={styles.addLink}>약속 추가하기 →</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          {todayAppts.slice(0, 2).map(item => (
            <TouchableOpacity key={item.id} style={styles.item} onPress={onNavigate} activeOpacity={0.7}>
              <View style={styles.iconWrap}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.title || item.destAddress}</Text>
                {item.title && <Text style={styles.location} numberOfLines={1}>{item.destAddress}</Text>}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.time}>{formatApptTime(item.appointmentTime)}</Text>
                {(() => {
                  const alarmMs = new Date(item.appointmentTime).getTime() - item.alarmBeforeMinutes * 60000;
                  if (alarmMs > Date.now()) {
                    const d = new Date(alarmMs);
                    return <Text style={styles.alarmHint}>알람 {String(d.getHours()).padStart(2, '0')}:{String(d.getMinutes()).padStart(2, '0')}</Text>;
                  }
                  return null;
                })()}
              </View>
            </TouchableOpacity>
          ))}
          {todayAppts.length > 2 && (
            <TouchableOpacity onPress={onNavigate} style={styles.moreItemBtn}>
              <Text style={styles.moreItemText}>+{todayAppts.length - 2}건 더 보기</Text>
              <Ionicons name="chevron-forward" size={13} color={colors.primary} />
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card:        { marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, ...cardShadow },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  label:       { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textSecondary },
  moreBtn:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  moreCount:   { fontSize: 12, fontFamily: fonts.semiBold, color: colors.primary },
  emptyWrap:   { alignItems: 'center', paddingVertical: 8 },
  emptyText:   { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center', paddingVertical: 4 },
  nextHint:    { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  addLink:     { fontSize: 13, fontFamily: fonts.semiBold, color: colors.primary, marginTop: 6 },
  item:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  iconWrap:    { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  title:       { fontSize: 14, fontFamily: fonts.semiBold, color: colors.textPrimary },
  location:    { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 2 },
  time:        { fontSize: 12, fontFamily: fonts.semiBold, color: colors.textSecondary },
  alarmHint:   { fontSize: 10, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 2 },
  moreItemBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  moreItemText:{ fontSize: 13, fontFamily: fonts.semiBold, color: colors.primary },
});
