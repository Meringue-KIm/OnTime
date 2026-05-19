import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  accessToken: string | null;
  isLoggedIn: boolean;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  loadToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  isLoggedIn: false,

  setTokens: async (accessToken, refreshToken) => {
    await AsyncStorage.multiSet([
      ['accessToken', accessToken],
      ['refreshToken', refreshToken],
    ]);
    set({ accessToken, isLoggedIn: true });
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
    set({ accessToken: null, isLoggedIn: false });
  },

  loadToken: async () => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) set({ accessToken: token, isLoggedIn: true });
  },
}));
