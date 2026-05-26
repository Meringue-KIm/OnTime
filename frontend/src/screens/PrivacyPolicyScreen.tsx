import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../constants/colors';

const SECTIONS = [
  {
    title: '1. 수집하는 개인정보',
    body: '• 이메일 주소 (회원가입 및 알림 발송)\n• 집·직장 위치 정보 (출발 시간 계산)\n• 약속 장소 위치 정보 (약속 알람 계산)\n• 알람 발송 기록 및 출근 피드백 (개인화 최적화)',
  },
  {
    title: '2. 수집 목적',
    body: '• 실시간 교통·날씨를 반영한 맞춤 출발 시간 계산\n• 출발 알람 및 약속 알람 FCM 푸시 발송\n• 정시 도착률 통계 및 개인화 알람 버퍼 최적화',
  },
  {
    title: '3. 제3자 제공 및 외부 API',
    body: '• 카카오맵 API: 경로 탐색 및 이동 시간 계산 (위치 정보 전달, 저장 없음)\n• 기상청 단기예보 API: 날씨 조회 (위치 정보 전달, 저장 없음)\n• Firebase Cloud Messaging: 푸시 알림 발송\n\n수집된 개인정보는 제3자에게 판매하거나 마케팅 목적으로 제공하지 않습니다.',
  },
  {
    title: '4. 보관 기간',
    body: '회원 탈퇴 시 모든 개인정보 및 이용 기록이 즉시 삭제됩니다.\n서비스 이용 중에는 서비스 제공을 위해 필요한 기간 동안만 보관합니다.',
  },
  {
    title: '5. 이용자의 권리',
    body: '• 언제든지 앱 내 설정 → 회원 탈퇴를 통해 모든 데이터 삭제 가능\n• 알림 권한은 기기 설정에서 언제든지 변경 가능\n• 위치 정보는 직접 입력 방식이며 GPS를 강제로 사용하지 않습니다',
  },
  {
    title: '6. 문의',
    body: '개인정보 처리에 관한 문의는 아래 이메일로 연락해주세요.\n\nkimsung3879@gmail.com',
  },
];

export default function PrivacyPolicyScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>개인정보처리방침</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.inner}>
        <Text style={styles.lastUpdated}>최종 업데이트: 2026년 5월</Text>

        {SECTIONS.map((sec, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionTitle}>{sec.title}</Text>
            <Text style={styles.sectionBody}>{sec.body}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>OnTime은 이용자의 개인정보를 소중히 여깁니다.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.bg },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  backBtn:      { padding: 4 },
  headerTitle:  { fontSize: 18, fontFamily: fonts.bold, color: colors.textPrimary },
  inner:        { padding: 20, gap: 16, paddingBottom: 40 },
  lastUpdated:  { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, marginBottom: 4 },
  section:      { backgroundColor: colors.card, borderRadius: 14, padding: 16, gap: 8 },
  sectionTitle: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary },
  sectionBody:  { fontSize: 13, fontFamily: fonts.regular, color: colors.textSecondary, lineHeight: 21 },
  footer:       { alignItems: 'center', paddingVertical: 16 },
  footerText:   { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
});
