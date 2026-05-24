import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Image, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, cardShadow } from '../constants/colors';
import { forgotPassword, resetPassword } from '../api/auth';

const logo = require('../../assets/logo.png');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen({ navigation }: any) {
  const [step, setStep]         = useState<1 | 2>(1);
  const [email, setEmail]       = useState('');
  const [code, setCode]         = useState('');
  const [newPw, setNewPw]       = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSendCode = async () => {
    if (!EMAIL_RE.test(email)) {
      Alert.alert('이메일 형식을 확인해주세요.');
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(email);
      setStep(2);
    } catch {
      Alert.alert('오류', '잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (code.length !== 6) {
      Alert.alert('6자리 코드를 입력해주세요.');
      return;
    }
    if (newPw.length < 8) {
      Alert.alert('새 비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (newPw !== confirmPw) {
      Alert.alert('비밀번호가 일치하지 않습니다.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email, code, newPw);
      Alert.alert('변경 완료', '비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.', [
        { text: '로그인', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (e: any) {
      Alert.alert('실패', e.response?.data?.message ?? '코드가 올바르지 않거나 만료되었습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>

          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.logoWrap}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>비밀번호 찾기</Text>
            <Text style={styles.subtitle}>
              {step === 1
                ? '가입한 이메일로 인증 코드를 보내드립니다.'
                : `${email}로 전송된\n6자리 코드를 입력해주세요.`}
            </Text>
          </View>

          <View style={styles.card}>
            {step === 1 ? (
              <>
                <Text style={styles.inputLabel}>이메일</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.input}
                    placeholder="가입한 이메일 입력"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
                <TouchableOpacity style={styles.button} onPress={handleSendCode} disabled={loading}>
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.buttonText}>인증 코드 받기</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>인증 코드 (6자리)</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={[styles.input, styles.codeInput]}
                    placeholder="123456"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={code}
                    onChangeText={setCode}
                  />
                </View>

                <Text style={[styles.inputLabel, { marginTop: 14 }]}>새 비밀번호</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.input}
                    placeholder="8자 이상 입력"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry
                    value={newPw}
                    onChangeText={setNewPw}
                  />
                </View>

                <Text style={[styles.inputLabel, { marginTop: 14 }]}>새 비밀번호 확인</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.input}
                    placeholder="비밀번호 재입력"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry
                    value={confirmPw}
                    onChangeText={setConfirmPw}
                  />
                </View>

                <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading}>
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.buttonText}>비밀번호 변경</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={styles.resendBtn} onPress={() => { setStep(1); setCode(''); }}>
                  <Text style={styles.resendText}>코드 다시 받기</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg },
  inner:       { flexGrow: 1, padding: 24 },
  backBtn:     { marginBottom: 8, alignSelf: 'flex-start', padding: 4 },
  logoWrap:    { alignItems: 'center', marginBottom: 28 },
  logo:        { width: 140, height: 63 },
  title:       { fontSize: 20, fontFamily: fonts.bold, color: colors.textPrimary, marginTop: 12 },
  subtitle:    { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  card:        { backgroundColor: colors.card, borderRadius: 16, padding: 20, ...cardShadow },
  inputLabel:  { fontSize: 12, fontFamily: fonts.semiBold, color: colors.textSecondary, marginBottom: 6 },
  inputWrap:   { backgroundColor: colors.bg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  input:       { fontSize: 15, fontFamily: fonts.regular, color: colors.textPrimary },
  codeInput:   { fontSize: 22, fontFamily: fonts.bold, letterSpacing: 6, textAlign: 'center' },
  button:      { marginTop: 20, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  buttonText:  { color: '#fff', fontSize: 16, fontFamily: fonts.bold },
  resendBtn:   { marginTop: 14, alignItems: 'center' },
  resendText:  { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted },
});
