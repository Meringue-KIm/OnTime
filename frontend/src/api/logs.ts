import client from './client';

export interface CommuteLog {
  id: number;
  logDate: string;
  recommendedDeparture: string | null;
  isLate: boolean | null;
}

export const getLogs = () => client.get<CommuteLog[]>('/logs');
export const submitFeedback = (id: number, isLate: boolean) =>
  client.post(`/logs/${id}/feedback`, { isLate });
