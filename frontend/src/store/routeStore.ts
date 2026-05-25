import { create } from 'zustand';
import * as routeApi from '../api/routes';
import type { RouteResponse, RouteRequest } from '../api/routes';
import { scheduleWeeklyAlarms, cancelAllAlarms } from '../utils/localAlarm';

interface RouteState {
  routes: RouteResponse[];
  loading: boolean;
  fetchRoutes: () => Promise<void>;
  saveRoute: (data: RouteRequest, id?: number) => Promise<void>;
  activateRoute: (id: number) => Promise<void>;
  removeRoute: (id: number) => Promise<void>;
  reset: () => void;
}

export const useRouteStore = create<RouteState>((set) => ({
  routes: [],
  loading: true,

  fetchRoutes: async () => {
    set({ loading: true });
    try {
      const { data } = await routeApi.getRoutes();
      set({ routes: data });
    } finally {
      set({ loading: false });
    }
  },

  saveRoute: async (data, id) => {
    let result: RouteResponse;
    if (id !== undefined) {
      const { data: updated } = await routeApi.updateRoute(id, data);
      result = updated;
      set(state => ({
        routes: state.routes.map(r => r.id === id ? updated : r),
      }));
    } else {
      const { data: created } = await routeApi.createRoute(data);
      result = created;
      set(state => ({ routes: [...state.routes, created] }));
    }
    if (result.isActive) {
      const days = result.activeDays.split(',').map(Number);
      scheduleWeeklyAlarms(days, result.arrivalTime, result.alarmBeforeMinutes).catch(() => {});
    }
  },

  activateRoute: async (id) => {
    const { data: activated } = await routeApi.activateRoute(id);
    set(state => ({
      routes: state.routes.map(r => ({ ...r, isActive: r.id === activated.id })),
    }));
    const days = activated.activeDays.split(',').map(Number);
    scheduleWeeklyAlarms(days, activated.arrivalTime, activated.alarmBeforeMinutes).catch(() => {});
  },

  removeRoute: async (id) => {
    const wasActive = useRouteStore.getState().routes.find(r => r.id === id)?.isActive;
    await routeApi.deleteRoute(id);
    set(state => ({ routes: state.routes.filter(r => r.id !== id) }));
    if (wasActive) cancelAllAlarms().catch(() => {});
  },

  reset: () => set({ routes: [], loading: false }),
}));
