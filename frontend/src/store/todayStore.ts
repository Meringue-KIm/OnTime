import { create } from 'zustand';
import { getToday, type TodayResponse } from '../api/today';
import { scheduleLocalAlarm } from '../utils/localAlarm';

interface TodayState {
  today: TodayResponse | null;
  loading: boolean;
  error: boolean;
  fetchToday: () => Promise<void>;
  reset: () => void;
}

export const useTodayStore = create<TodayState>((set) => ({
  today: null,
  loading: true,
  error: false,

  fetchToday: async () => {
    set({ loading: true, error: false });
    try {
      const { data } = await getToday();
      set({ today: data, error: false });
      if (data.recommendedDeparture) {
        scheduleLocalAlarm(String(data.recommendedDeparture)).catch(() => {});
      }
    } catch {
      // 기존 today 값 유지 — 순간적 오류에도 출발 시간 카드 초기화 방지
      set({ error: true });
    } finally {
      set({ loading: false });
    }
  },

  reset: () => set({ today: null, loading: false, error: false }),
}));
