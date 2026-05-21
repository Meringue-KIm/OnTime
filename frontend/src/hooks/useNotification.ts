import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { updateFcmToken } from '../api/auth';

export function useNotification() {
  useEffect(() => {
    if (!Device.isDevice) return;
    (async () => {
      const { status: existing } = await Notifications.getPermissionsAsync();
      const { status } = existing === 'granted'
        ? { status: existing }
        : await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;
      const token = (await Notifications.getDevicePushTokenAsync()).data;
      updateFcmToken(token).catch(() => {});
    })();
  }, []);
}
