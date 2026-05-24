import { create } from 'zustand';
import { getToday, type TodayResponse } from '../api/today';
import { scheduleLocalAlarm } from '../utils/localAlarm';

interface TodayState {
  today: TodayResponse | null;
  loading: boolean;
  error: boolean;
  fetchToday: () => Promise<void>;
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
      set({ today: null, error: true });
    } finally {
      set({ loading: false });
    }
  },
}));
