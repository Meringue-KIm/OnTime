import React, { useState } from 'react';
import {
  Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Image, View, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { login } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { colors, fonts, cardShadow } from '../constants/colors';

const logo = require('../../assets/logo.png');

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const setTokens = useAuthStore((s) => s.setTokens);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await login(email, password);
      await setTokens(data.accessToken, data.refreshToken);
    } catch (e: any) {
      Alert.alert('로그인 실패', e.response?.data?.message ?? '다시 시도해주세요.');
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
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <Text style={[styles.inputLabel, { marginTop: 14 }]}>비밀번호</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="비밀번호 입력"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>로그인</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
          <Text style={styles.link}>계정이 없으신가요? <Text style={styles.linkBold}>회원가입</Text></Text>
        </TouchableOpacity>

        {__DEV__ && (
          <TouchableOpacity
            style={styles.devButton}
            onPress={() => setTokens('dev-access-token', 'dev-refresh-token')}
          >
            <Text style={styles.devButtonText}>🛠 개발자 모드로 진입</Text>
          </TouchableOpacity>
        )}

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
  devButton:   { marginTop: 32, borderWidth: 1, borderColor: colors.border, borderRadius: 10, borderStyle: 'dashed', padding: 12, alignItems: 'center' },
  devButtonText: { color: colors.textMuted, fontSize: 13, fontFamily: fonts.regular },
});
