import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  accessToken: string | null;
  email: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  setTokens: (accessToken: string, refreshToken: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
  loadToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  email: null,
  isLoggedIn: false,
  isLoading: true,

  setTokens: async (accessToken, refreshToken, email) => {
    const pairs: [string, string][] = [
      ['accessToken', accessToken],
      ['refreshToken', refreshToken],
    ];
    if (email) pairs.push(['userEmail', email]);
    await AsyncStorage.multiSet(pairs);
    set({ accessToken, isLoggedIn: true, ...(email ? { email } : {}) });
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userEmail']);
    set({ accessToken: null, email: null, isLoggedIn: false });
  },

  loadToken: async () => {
    const [token, email] = await Promise.all([
      AsyncStorage.getItem('accessToken'),
      AsyncStorage.getItem('userEmail'),
    ]);
    set({ accessToken: token ?? null, email: email ?? null, isLoggedIn: !!token, isLoading: false });
  },
}));
