import { create } from 'zustand';
import * as routeApi from '../api/routes';
import type { RouteResponse, RouteRequest } from '../api/routes';

interface RouteState {
  routes: RouteResponse[];
  loading: boolean;
  fetchRoutes: () => Promise<void>;
  saveRoute: (data: RouteRequest, id?: number) => Promise<void>;
  removeRoute: (id: number) => Promise<void>;
}

export const useRouteStore = create<RouteState>((set) => ({
  routes: [],
  loading: false,

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
    if (id !== undefined) {
      const { data: updated } = await routeApi.updateRoute(id, data);
      set(state => ({
        routes: state.routes.map(r => r.id === id ? updated : r),
      }));
    } else {
      const { data: created } = await routeApi.createRoute(data);
      set(state => ({ routes: [...state.routes, created] }));
    }
  },

  removeRoute: async (id) => {
    await routeApi.deleteRoute(id);
    set(state => ({ routes: state.routes.filter(r => r.id !== id) }));
  },
}));
