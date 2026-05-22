import client from './client';

export interface RouteRequest {
  homeAddress: string;
  homeLat?: number;
  homeLng?: number;
  workAddress: string;
  workLat?: number;
  workLng?: number;
  arrivalTime: string; // "HH:mm:ss"
  alarmBeforeMinutes: number;
  activeDays?: string; // "0,1,2,3,4,5,6" 중 선택 (0=일,1=월...6=토)
  transportMode?: 'car' | 'transit' | 'walk';
}

export interface RouteResponse {
  id: number;
  homeAddress: string;
  homeLat?: number;
  homeLng?: number;
  workAddress: string;
  workLat?: number;
  workLng?: number;
  arrivalTime: string;
  alarmBeforeMinutes: number;
  isActive: boolean;
  activeDays: string;
  transportMode: string;
}

export const getRoutes = () => client.get<RouteResponse[]>('/routes');
export const createRoute = (data: RouteRequest) => client.post<RouteResponse>('/routes', data);
export const updateRoute = (id: number, data: RouteRequest) => client.put<RouteResponse>(`/routes/${id}`, data);
export const deleteRoute = (id: number) => client.delete(`/routes/${id}`);
