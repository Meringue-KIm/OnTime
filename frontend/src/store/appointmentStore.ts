import { create } from 'zustand';
import * as apptApi from '../api/appointments';
import type { AppointmentResponse, AppointmentRequest } from '../api/appointments';

interface AppointmentState {
  appointments: AppointmentResponse[];
  loading: boolean;
  fetchAppointments: () => Promise<void>;
  addAppointment: (data: AppointmentRequest) => Promise<void>;
  removeAppointment: (id: number) => Promise<void>;
  completeDone: (id: number) => Promise<void>;
}

export const useAppointmentStore = create<AppointmentState>((set) => ({
  appointments: [],
  loading: false,

  fetchAppointments: async () => {
    set({ loading: true });
    try {
      const { data } = await apptApi.getAppointments();
      set({ appointments: data });
    } finally {
      set({ loading: false });
    }
  },

  addAppointment: async (data) => {
    const { data: created } = await apptApi.createAppointment(data);
    set(state => ({ appointments: [...state.appointments, created] }));
  },

  removeAppointment: async (id) => {
    await apptApi.deleteAppointment(id);
    set(state => ({ appointments: state.appointments.filter(a => a.id !== id) }));
  },

  completeDone: async (id) => {
    await apptApi.markDone(id);
    set(state => ({
      appointments: state.appointments.map(a =>
        a.id === id ? { ...a, isDone: true } : a
      ),
    }));
  },
}));
