import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateFcmToken } from '../api/auth';

const STORAGE_KEYS = {
  vibration:  'alarm_vibration',
  wakeLight:  'alarm_wake_light',
};

export async function setupNotificationChannel() {
  if (Platform.OS !== 'android') return;
  const vibration = (await AsyncStorage.getItem(STORAGE_KEYS.vibration)) !== 'false';
  await Notifications.setNotificationChannelAsync('alarm', {
    name: 'OnTime 알람',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: vibration ? [0, 400, 200, 400] : undefined,
    enableVibrate: vibration,
    lightingEnabled: true,
    lightColor: '#2D6A4F',
    sound: 'default',
  });
}

export function useNotification() {
  useEffect(() => {
    if (!Device.isDevice) return;

    // FCM 토큰 등록
    (async () => {
      const { status: existing } = await Notifications.getPermissionsAsync();
      const { status } = existing === 'granted'
        ? { status: existing }
        : await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;

      await setupNotificationChannel();

      const token = (await Notifications.getDevicePushTokenAsync()).data;
      updateFcmToken(token).catch(() => {});
    })();

    // 포그라운드 알림 수신 시 화면 밝기 올리기
    const sub = Notifications.addNotificationReceivedListener(async () => {
      const wakeLight = (await AsyncStorage.getItem(STORAGE_KEYS.wakeLight)) === 'true';
      if (!wakeLight) return;
      try {
        const Brightness = await import('expo-brightness');
        const current = await Brightness.getBrightnessAsync();
        await Brightness.setBrightnessAsync(1.0);
        setTimeout(() => Brightness.setBrightnessAsync(current), 60_000);
      } catch {}
    });

    return () => sub.remove();
  }, []);
}
