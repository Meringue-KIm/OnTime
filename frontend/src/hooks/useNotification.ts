import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { updateFcmToken } from '../api/auth';

const STORAGE_KEYS = {
  vibration:     'alarm_vibration',
  gradualVolume: 'alarm_gradual_volume',
  wakeLight:     'alarm_wake_light',
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
    sound: 'alarm',  // assets/alarm.wav (EAS 빌드 시 적용)
  });
}

export function useNotification() {
  const soundRef    = useRef<Audio.Sound | null>(null);
  const rampRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopRef     = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopAlarm = async () => {
    if (rampRef.current)  { clearInterval(rampRef.current); rampRef.current = null; }
    if (stopRef.current)  { clearTimeout(stopRef.current);  stopRef.current = null; }
    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => {});
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
  };

  useEffect(() => {
    if (!Device.isDevice) return;

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

    // 포그라운드 알림 수신
    const sub = Notifications.addNotificationReceivedListener(async () => {
      // 기상 라이트
      const wakeLight = (await AsyncStorage.getItem(STORAGE_KEYS.wakeLight)) === 'true';
      if (wakeLight) {
        try {
          const Brightness = await import('expo-brightness');
          const current = await Brightness.getBrightnessAsync();
          await Brightness.setBrightnessAsync(1.0);
          setTimeout(() => Brightness.setBrightnessAsync(current), 60_000);
        } catch {}
      }

      // 점진적 음량 — 포그라운드에서만 동작
      if (Platform.OS === 'web') return;
      const gradualVolume = (await AsyncStorage.getItem(STORAGE_KEYS.gradualVolume)) !== 'false';
      if (!gradualVolume) return;

      await stopAlarm();
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/alarm.wav'),
          { shouldPlay: true, isLooping: true, volume: 0.05 },
        );
        soundRef.current = sound;

        let vol = 0.05;
        rampRef.current = setInterval(async () => {
          vol = Math.min(1.0, vol + 0.05);
          await sound.setVolumeAsync(vol).catch(() => {});
          if (vol >= 1.0) { clearInterval(rampRef.current!); rampRef.current = null; }
        }, 2000); // 2초마다 +5%, ~38초에 최대

        // 2분 후 자동 종료
        stopRef.current = setTimeout(stopAlarm, 120_000);
      } catch {}
    });

    // 알림 탭/해제 시 사운드 중단
    const responseSub = Notifications.addNotificationResponseReceivedListener(() => {
      stopAlarm();
    });

    return () => {
      sub.remove();
      responseSub.remove();
      stopAlarm();
    };
  }, []);
}
