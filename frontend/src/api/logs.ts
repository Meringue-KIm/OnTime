import client from './client';

export interface CommuteLog {
  id: number;
  logDate: string;
  recommendedDeparture: string | null;
  isLate: boolean | null;
  actualDiffMinutes: number | null;
}

export const getLogs = () => client.get<CommuteLog[]>('/logs');
export const submitFeedback = (id: number, actualDiffMinutes: number) =>
  client.post(`/logs/${id}/feedback`, { actualDiffMinutes });
