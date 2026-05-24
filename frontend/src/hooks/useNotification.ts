import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { updateFcmToken } from '../api/auth';

const STORAGE_KEYS = {
  vibration: 'alarm_vibration',
};

export async function setupNotificationChannel() {
  if (Platform.OS !== 'android') return;
  const vibration = (await AsyncStorage.getItem(STORAGE_KEYS.vibration)) !== 'false';
  await Notifications.setNotificationChannelAsync('alarm', {
    name: 'OnTime 알람',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: vibration ? [0, 400, 200, 400] : undefined,
    enableVibrate: vibration,
    lightColor: '#2D6A4F',
    sound: 'alarm',  // assets/alarm.wav (EAS 빌드 시 적용)
  });
}

export function useNotification(): { notifPermission: 'granted' | 'denied' | 'unknown' } {
  const [notifPermission, setNotifPermission] = useState<'granted' | 'denied' | 'unknown'>('unknown');
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
      let finalStatus = existing;

      if (existing !== 'granted') {
        await new Promise<void>(resolve =>
          Alert.alert(
            '알림 권한 필요',
            'OnTime이 매일 아침 출발 시간 알람을 보내려면 알림 권한이 필요합니다.',
            [{ text: '확인', onPress: () => resolve() }],
          )
        );
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      const { status } = { status: finalStatus };

      if (status !== 'granted') {
        setNotifPermission('denied');
        return;
      }

      setNotifPermission('granted');
      await setupNotificationChannel();

      const token = (await Notifications.getDevicePushTokenAsync()).data;
      updateFcmToken(token).catch(() => {});
    })();

    // 포그라운드 알림 수신 — 앱이 열려있을 때 사운드 재생
    const sub = Notifications.addNotificationReceivedListener(async () => {
      if (Platform.OS === 'web') return;
      await stopAlarm();
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/alarm.wav'),
          { shouldPlay: true, isLooping: true, volume: 1.0 },
        );
        soundRef.current = sound;
        stopRef.current = setTimeout(stopAlarm, 120_000);
      } catch {}
    });

    // 알림 탭 시 사운드 중단 + 스누즈 옵션
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      stopAlarm();
      const body = response.notification.request.content.body ?? '';
      Alert.alert(
        '알람을 끄시겠어요?',
        body,
        [
          {
            text: '5분 후 다시 알림',
            onPress: () => {
              Notifications.scheduleNotificationAsync({
                content: {
                  title: '출발할 시간이에요! (스누즈)',
                  body,
                  sound: true,
                },
                trigger: { seconds: 300, channelId: 'alarm' } as any,
              });
            },
          },
          { text: '알람 끄기', style: 'destructive' },
        ],
      );
    });

    return () => {
      sub.remove();
      responseSub.remove();
      stopAlarm();
    };
  }, []);

  return { notifPermission };
}
