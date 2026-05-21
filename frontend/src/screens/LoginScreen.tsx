import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { login } from '../api/auth';
import { useAuthStore } from '../store/authStore';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
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
    <View style={styles.container}>
      <Text style={styles.title}>✈ OnTime</Text>
      <Text style={styles.subtitle}>스마트 출발 시간 알람</Text>

      <TextInput
        style={styles.input}
        placeholder="이메일"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="비밀번호"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>로그인</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
        <Text style={styles.link}>계정이 없으신가요? 회원가입</Text>
      </TouchableOpacity>

      {__DEV__ && (
        <TouchableOpacity
          style={styles.devButton}
          onPress={() => setTokens('dev-access-token', 'dev-refresh-token')}
        >
          <Text style={styles.devButtonText}>🛠 개발자 모드로 진입</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#2563EB', marginBottom: 4 },
  subtitle: { fontSize: 14, textAlign: 'center', color: '#6B7280', marginBottom: 40 },
  input: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10,
    padding: 14, marginBottom: 12, fontSize: 16,
  },
  button: {
    backgroundColor: '#2563EB', borderRadius: 10,
    padding: 16, alignItems: 'center', marginTop: 4,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { textAlign: 'center', marginTop: 16, color: '#6B7280' },
  devButton: {
    marginTop: 32, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    borderStyle: 'dashed', padding: 12, alignItems: 'center',
  },
  devButtonText: { color: '#9CA3AF', fontSize: 13 },
});
