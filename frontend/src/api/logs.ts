import client from './client';

export interface CommuteLog {
  id: number;
  logDate: string;
  recommendedDeparture: string | null;
  isLate: boolean | null;
}

export const getLogs = () => client.get<CommuteLog[]>('/logs');
