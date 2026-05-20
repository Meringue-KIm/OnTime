import client from './client';

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export const signup = (email: string, password: string) =>
  client.post('/auth/signup', { email, password });

export const login = (email: string, password: string) =>
  client.post<TokenResponse>('/auth/login', { email, password });

export const updateFcmToken = (fcmToken: string) =>
  client.put('/auth/fcmtoken', { fcmToken });
