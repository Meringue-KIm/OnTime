import React, { useState, useRef } from 'react';
import {
  Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Image, View, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signup, login } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { colors, fonts, cardShadow } from '../constants/colors';

const logo = require('../../assets/logo.png');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupScreen({ navigation }: any) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const setTokens = useAuthStore((s) => s.setTokens);
  const passwordRef = useRef<any>(null);
  const confirmRef  = useRef<any>(null);

  const handleSignup = async () => {
    if (!email || !password || !confirm) {
      Alert.alert('모든 항목을 입력해주세요.');
      return;
    }
    if (!EMAIL_RE.test(email)) {
      Alert.alert('이메일 형식을 확인해주세요.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    setLoading(true);
    try {
      await signup(email, password);
      const { data } = await login(email, password);
      await setTokens(data.accessToken, data.refreshToken);
    } catch (e: any) {
      Alert.alert('가입 실패', e.response?.data?.message ?? '다시 시도해주세요.');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>

        {/* 로고 */}
        <View style={styles.logoWrap}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <Text style={styles.subtitle}>새 계정 만들기</Text>
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
              onChangeText={setEmail}
            />
          </View>

          <Text style={[styles.inputLabel, { marginTop: 14 }]}>비밀번호</Text>
          <View style={styles.inputWrap}>
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder="8자 이상 입력"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
              blurOnSubmit={false}
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <Text style={[styles.inputLabel, { marginTop: 14 }]}>비밀번호 확인</Text>
          <View style={styles.inputWrap}>
            <TextInput
              ref={confirmRef}
              style={styles.input}
              placeholder="비밀번호 재입력"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSignup}
              value={confirm}
              onChangeText={setConfirm}
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>가입하기</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>이미 계정이 있으신가요? <Text style={styles.linkBold}>로그인</Text></Text>
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
  card:        { backgroundColor: colors.card, borderRadius: 16, padding: 20, marginBottom: 20, ...cardShadow },
  inputLabel:  { fontSize: 12, fontFamily: fonts.semiBold, color: colors.textSecondary, marginBottom: 6 },
  inputWrap:   { backgroundColor: colors.bg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  input:       { fontSize: 15, fontFamily: fonts.regular, color: colors.textPrimary },
  button:      { marginTop: 20, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  buttonText:  { color: '#fff', fontSize: 16, fontFamily: fonts.bold },
  link:        { textAlign: 'center', fontSize: 14, fontFamily: fonts.regular, color: colors.textMuted },
  linkBold:    { fontFamily: fonts.semiBold, color: colors.primary },
});
