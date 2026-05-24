import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, cardShadow } from '../constants/colors';
import { changePassword, deleteAccount } from '../api/auth';
import { useAuthStore } from '../store/authStore';

export default function SettingsScreen({ navigation }: any) {
  const { logout } = useAuthStore();
  const [curPw, setCurPw]     = useState('');
  const [newPw, setNewPw]     = useState('');
  const [pwSaving, setPwSaving] = useState(false);

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
        try {
          await deleteAccount();
          await logout();
        } catch {
          Alert.alert('오류', '탈퇴 처리 중 문제가 발생했습니다.');
        }
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>설정</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.inner}>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>비밀번호 변경</Text>
          <TextInput
            style={styles.input}
            placeholder="현재 비밀번호"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={curPw}
            onChangeText={setCurPw}
          />
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            placeholder="새 비밀번호 (8자 이상)"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={newPw}
            onChangeText={setNewPw}
          />
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
            Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
              { text: '취소', style: 'cancel' },
              { text: '로그아웃', style: 'destructive', onPress: logout },
            ]);
          }}>
            <View style={[styles.rowIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="log-out-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.rowItemText}>로그아웃</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.rowItem} onPress={handleDeleteAccount}>
            <View style={[styles.rowIcon, { backgroundColor: colors.danger + '18' }]}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </View>
            <Text style={[styles.rowItemText, { color: colors.danger }]}>회원 탈퇴</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

      </ScrollView>
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
  rowItem:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowIcon:       { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowItemText:   { flex: 1, fontSize: 15, fontFamily: fonts.semiBold, color: colors.textPrimary },
  divider:       { height: 1, backgroundColor: colors.border, marginVertical: 4 },
});
