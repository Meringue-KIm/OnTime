import axios from 'axios';
import { Platform } from 'react-native';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL
  ?? (Platform.OS === 'android' ? 'http://10.0.2.2:8080/api' : 'http://localhost:8080/api');

const SERVER_ROOT = API_BASE.replace(/\/api\/?$/, '');

export function pingServer(): void {
  axios.get(`${SERVER_ROOT}/health`, { timeout: 15000 }).catch(() => {});
}
