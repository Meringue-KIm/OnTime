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

export const changePassword = (currentPassword: string, newPassword: string) =>
  client.put('/auth/password', { currentPassword, newPassword });

export const deleteAccount = () =>
  client.delete('/auth/account');

export const sendTestAlarm = () =>
  client.post('/alarm/test');

export const forgotPassword = (email: string) =>
  client.post('/auth/forgot-password', { email });

export const resetPassword = (email: string, code: string, newPassword: string) =>
  client.post('/auth/reset-password', { email, code, newPassword });
