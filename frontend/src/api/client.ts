import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL
  ?? (Platform.OS === 'android' ? 'http://10.0.2.2:8080/api' : 'http://localhost:8080/api');

const client = axios.create({ baseURL: BASE_URL });

client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 토큰 갱신 중 중복 요청 방지
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    original._retry = true;

    // 이미 갱신 중이면 완료될 때까지 대기
    if (isRefreshing) {
      return new Promise((resolve) => {
        refreshQueue.push((newToken) => {
          original.headers.Authorization = `Bearer ${newToken}`;
          resolve(client(original));
        });
      });
    }

    isRefreshing = true;

    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('no refresh token');

      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });

      await AsyncStorage.setItem('accessToken', data.accessToken);
      original.headers.Authorization = `Bearer ${data.accessToken}`;

      refreshQueue.forEach((cb) => cb(data.accessToken));
      refreshQueue = [];

      return client(original);
    } catch {
      // Refresh Token도 만료 → 안내 후 강제 로그아웃
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
      const { useAuthStore } = await import('../store/authStore');
      useAuthStore.getState().logout();
      Alert.alert(
        '세션이 만료되었습니다',
        '보안을 위해 자동으로 로그아웃되었습니다. 다시 로그인해주세요.',
        [{ text: '확인' }],
      );
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);

export default client;
