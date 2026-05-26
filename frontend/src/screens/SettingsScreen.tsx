import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, cardShadow } from '../constants/colors';
import { changePassword, deleteAccount, getMe } from '../api/auth';
import { useAuthStore } from '../store/authStore';

const appVersion = Constants.expoConfig?.version ?? (Constants as any).manifest?.version ?? '1.0.0';

export default function SettingsScreen({ navigation }: any) {
  const { logout, email: storedEmail } = useAuthStore();
  const [curPw, setCurPw]         = useState('');
  const [newPw, setNewPw]         = useState('');
  const [showCurPw, setShowCurPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwSaving, setPwSaving]   = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [email, setEmail]     = useState<string | null>(storedEmail);
  const [joinedAt, setJoinedAt] = useState<string | null>(null);

  useEffect(() => {
    getMe().then(({ data }) => {
      setEmail(data.email);
      const d = new Date(data.createdAt);
      setJoinedAt(`${d.getFullYear()}년 ${d.getMonth() + 1}월 가입`);
    }).catch(() => {
      // 오프라인 시 authStore의 이메일로 fallback (이미 storedEmail로 초기화됨)
    });
  }, []);

  const handleChangePassword = async () => {
    if (!curPw || !newPw) { Alert.alert('비밀번호를 모두 입력해주세요.'); return; }
    if (newPw.length < 8)  { Alert.alert('새 비밀번호는 8자 이상이어야 합니다.'); return; }
    setPwSaving(true);
    try {
      await changePassword(curPw, newPw);
      Alert.alert('변경 완료', '비밀번호가 변경되었습니다.');
      setCurPw(''); setNewPw('');
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? '비밀번호 변경에 실패했습니다. 현재 비밀번호를 확인해주세요.';
      Alert.alert('오류', msg);
    } finally {
      setPwSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert('회원 탈퇴', '탈퇴하면 모든 데이터가 삭제됩니다. 계속하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '탈퇴', style: 'destructive', onPress: async () => {
        setDeleteLoading(true);
        try {
          await deleteAccount();
          await logout();
        } catch {
          Alert.alert('오류', '탈퇴 처리 중 문제가 발생했습니다.');
        } finally {
          setDeleteLoading(false);
        }
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>설정</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.inner}>

        {/* 계정 정보 */}
        <View style={styles.accountCard}>
          <View style={styles.accountIconWrap}>
            <Ionicons name="person-circle-outline" size={38} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.accountEmail}>{email ?? '불러오는 중...'}</Text>
            {joinedAt && <Text style={styles.accountMeta}>{joinedAt}</Text>}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>비밀번호 변경</Text>
          <View style={styles.pwWrap}>
            <TextInput
              style={styles.pwInput}
              placeholder="현재 비밀번호"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showCurPw}
              value={curPw}
              onChangeText={setCurPw}
            />
            <TouchableOpacity onPress={() => setShowCurPw(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name={showCurPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={[styles.pwWrap, { marginTop: 8 }]}>
            <TextInput
              style={styles.pwInput}
              placeholder="새 비밀번호 (8자 이상)"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showNewPw}
              value={newPw}
              onChangeText={setNewPw}
            />
            <TouchableOpacity onPress={() => setShowNewPw(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name={showNewPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.btn, pwSaving && { opacity: 0.6 }]}
            onPress={handleChangePassword}
            disabled={pwSaving}
          >
            {pwSaving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>비밀번호 변경</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <TouchableOpacity style={styles.rowItem} onPress={() => {
            if (Platform.OS === 'web') {
              if ((window as any).confirm('정말 로그아웃하시겠습니까?')) logout();
            } else {
              Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
                { text: '취소', style: 'cancel' },
                { text: '로그아웃', style: 'destructive', onPress: logout },
              ]);
            }
          }}>
            <View style={[styles.rowIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="log-out-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.rowItemText}>로그아웃</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.rowItem} onPress={handleDeleteAccount} disabled={deleteLoading}>
            <View style={[styles.rowIcon, { backgroundColor: colors.danger + '18' }]}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </View>
            <Text style={[styles.rowItemText, { color: colors.danger }]}>회원 탈퇴</Text>
            {deleteLoading
              ? <ActivityIndicator size="small" color={colors.danger} />
              : <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
          </TouchableOpacity>
        </View>

        <View style={styles.versionWrap}>
          <Text style={styles.versionText}>OnTime v{appVersion}</Text>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.bg },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  backBtn:       { padding: 4 },
  headerTitle:   { fontSize: 18, fontFamily: fonts.bold, color: colors.textPrimary },
  inner:         { padding: 20, gap: 12 },
  card:          { backgroundColor: colors.card, borderRadius: 16, padding: 16, ...cardShadow },
  sectionTitle:  { fontSize: 14, fontFamily: fonts.semiBold, color: colors.textSecondary, marginBottom: 12 },
  input:         { backgroundColor: colors.bg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: fonts.regular, color: colors.textPrimary },
  btn:           { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 12 },
  btnText:       { color: '#fff', fontFamily: fonts.semiBold, fontSize: 14 },
  accountCard:   { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 16, padding: 16, ...cardShadow },
  accountIconWrap:{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  accountEmail:  { fontSize: 15, fontFamily: fonts.semiBold, color: colors.textPrimary },
  accountMeta:   { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 3 },
  rowItem:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowIcon:       { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowItemText:   { flex: 1, fontSize: 15, fontFamily: fonts.semiBold, color: colors.textPrimary },
  divider:       { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  versionWrap:   { alignItems: 'center', paddingVertical: 20 },
  versionText:   { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted },
  pwWrap:        { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  pwInput:       { flex: 1, fontSize: 14, fontFamily: fonts.regular, color: colors.textPrimary },
});
