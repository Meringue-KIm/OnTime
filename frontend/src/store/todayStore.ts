import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getToday, type TodayResponse } from '../api/today';
import { scheduleLocalAlarm } from '../utils/localAlarm';

const CACHE_KEY = 'today_cache';

interface TodayCache {
  data: TodayResponse;
  cachedAt: string; // ISO string
}

interface TodayState {
  today: TodayResponse | null;
  loading: boolean;
  error: boolean;
  cachedAt: string | null; // 캐시 시각 (오프라인 시 표시용)
  fetchToday: () => Promise<void>;
  reset: () => void;
}

async function loadCache(): Promise<TodayCache | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TodayCache;
  } catch {
    return null;
  }
}

async function saveCache(data: TodayResponse): Promise<void> {
  try {
    const cache: TodayCache = { data, cachedAt: new Date().toISOString() };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

export const useTodayStore = create<TodayState>((set, get) => ({
  today: null,
  loading: true,
  error: false,
  cachedAt: null,

  fetchToday: async () => {
    set({ loading: true, error: false });
    try {
      const { data } = await getToday();
      set({ today: data, error: false, cachedAt: null });
      await saveCache(data);
      if (data.recommendedDeparture) {
        scheduleLocalAlarm(String(data.recommendedDeparture)).catch(() => {});
      }
    } catch {
      // 네트워크 오류 — 기존 데이터 유지, 없으면 캐시 복원
      if (!get().today) {
        const cache = await loadCache();
        if (cache) {
          set({ today: cache.data, cachedAt: cache.cachedAt, error: true });
        } else {
          set({ error: true });
        }
      } else {
        set({ error: true });
      }
    } finally {
      set({ loading: false });
    }
  },

  reset: () => set({ today: null, loading: false, error: false, cachedAt: null }),
}));
