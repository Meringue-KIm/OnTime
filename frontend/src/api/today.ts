import client from './client';

export interface WeatherData {
  condition: string;
  icon: string;
  temperature: number;
  bufferMinutes: number;
}

export interface TodayResponse {
  recommendedDeparture?: string;
  arrivalTime?: string;
  drivingMinutes?: number;
  logDate?: string;
  message?: string;
  weather?: WeatherData;
  personalBuffer?: number;
}

export const getToday = () => client.get<TodayResponse>('/today');
