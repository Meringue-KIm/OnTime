import client from './client';

export interface AppointmentRequest {
  destAddress: string;
  destLat?: number;
  destLng?: number;
  appointmentTime: string; // ISO-8601: "2026-05-21T14:30:00"
  alarmBeforeMinutes: number;
}

export interface AppointmentResponse {
  id: number;
  destAddress: string;
  destLat?: number;
  destLng?: number;
  appointmentTime: string;
  alarmBeforeMinutes: number;
  isDone: boolean;
  dDay: number;
}

export const getAppointments = () => client.get<AppointmentResponse[]>('/appointments');
export const createAppointment = (data: AppointmentRequest) => client.post<AppointmentResponse>('/appointments', data);
export const updateAppointment = (id: number, data: AppointmentRequest) => client.put<AppointmentResponse>(`/appointments/${id}`, data);
export const deleteAppointment = (id: number) => client.delete(`/appointments/${id}`);
export const markDone = (id: number) => client.patch(`/appointments/${id}/done`);
