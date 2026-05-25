import React, { useState, useRef } from 'react';
import {
  Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Image, View, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { login } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, cardShadow } from '../constants/colors';

const logo = require('../../assets/logo.png');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const setTokens = useAuthStore((s) => s.setTokens);
  const passwordRef = useRef<any>(null);

  const handleLogin = async () => {
    if (!email || !password) { setError('이메일과 비밀번호를 입력해주세요.'); return; }
    if (!EMAIL_RE.test(email)) { setError('이메일 형식을 확인해주세요.'); return; }
    setLoading(true);
    setError('');
    try {
      const { data } = await login(email, password);
      await setTokens(data.accessToken, data.refreshToken);
    } catch (e: any) {
      setError(e.response?.data?.message ?? '이메일 또는 비밀번호가 맞지 않습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>

        {/* 로고 */}
        <View style={styles.logoWrap}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <Text style={styles.subtitle}>스마트 출발 시간 알람</Text>
          <View style={styles.featureRow}>
            <View style={styles.featureItem}>
              <Ionicons name="alarm-outline" size={14} color={colors.primary} />
              <Text style={styles.featureText}>매일 자동 알람</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="car-outline" size={14} color={colors.primary} />
              <Text style={styles.featureText}>실시간 교통 반영</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="cloudy-outline" size={14} color={colors.primary} />
              <Text style={styles.featureText}>날씨 자동 계산</Text>
            </View>
          </View>
        </View>

        {/* 입력 카드 */}
        <View style={styles.card}>
          <Text style={styles.inputLabel}>이메일</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="example@email.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
              value={email}
              onChangeText={v => { setEmail(v); setError(''); }}
            />
          </View>

          <Text style={[styles.inputLabel, { marginTop: 14 }]}>비밀번호</Text>
          <View style={styles.inputWrap}>
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder="비밀번호 입력"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              value={password}
              onChangeText={v => { setPassword(v); setError(''); }}
            />
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={14} color="#D32F2F" />
              <Text style={styles.errorMsg}>{error}</Text>
            </View>
          ) : null}
          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>로그인</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
          <Text style={styles.link}>계정이 없으신가요? <Text style={styles.linkBold}>회원가입</Text></Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={styles.forgotLink}>비밀번호를 잊으셨나요?</Text>
        </TouchableOpacity>


      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg },
  inner:       { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoWrap:    { alignItems: 'center', marginBottom: 32 },
  logo:        { width: 160, height: 72 },
  subtitle:    { fontSize: 14, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 4 },
  featureRow:  { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  featureText: { fontSize: 11, fontFamily: fonts.semiBold, color: colors.primary },
  card:        { backgroundColor: colors.card, borderRadius: 16, padding: 20, marginBottom: 20, ...cardShadow },
  inputLabel:  { fontSize: 12, fontFamily: fonts.semiBold, color: colors.textSecondary, marginBottom: 6 },
  inputWrap:   { backgroundColor: colors.bg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  input:       { fontSize: 15, fontFamily: fonts.regular, color: colors.textPrimary },
  button:      { marginTop: 20, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  buttonText:  { color: '#fff', fontSize: 16, fontFamily: fonts.bold },
  link:        { textAlign: 'center', fontSize: 14, fontFamily: fonts.regular, color: colors.textMuted },
  linkBold:    { fontFamily: fonts.semiBold, color: colors.primary },
  forgotLink:  { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted, textDecorationLine: 'underline' },
  errorBox:    { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#FFEBEE', borderRadius: 8, padding: 10, marginTop: 14 },
  errorMsg:    { flex: 1, fontSize: 13, fontFamily: fonts.regular, color: '#D32F2F', lineHeight: 18 },

});
