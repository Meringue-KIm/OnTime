import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { updateFcmToken } from '../api/auth';
import { cancelLocalAlarm } from '../utils/localAlarm';
import { submitFeedback } from '../api/logs';

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
    sound: 'alarm',
  });
}

interface UseNotificationResult {
  notifPermission: 'granted' | 'denied' | 'unknown';
  alarmFired: boolean;
  dismissAlarmBanner: () => void;
}

export function useNotification(): UseNotificationResult {
  const [notifPermission, setNotifPermission] = useState<'granted' | 'denied' | 'unknown'>('unknown');
  const [alarmFired, setAlarmFired] = useState(false);
  const soundRef       = useRef<Audio.Sound | null>(null);
  const rampRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAlarmAt    = useRef<number>(0);  // 중복 발화 방지

  const stopAlarm = async () => {
    if (rampRef.current)  { clearInterval(rampRef.current); rampRef.current = null; }
    if (stopRef.current)  { clearTimeout(stopRef.current);  stopRef.current = null; }
    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => {});
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
  };

  const dismissAlarmBanner = () => setAlarmFired(false);

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

      if (finalStatus !== 'granted') {
        setNotifPermission('denied');
        return;
      }

      setNotifPermission('granted');
      await setupNotificationChannel();

      const token = (await Notifications.getDevicePushTokenAsync()).data;
      updateFcmToken(token).catch(() => {});
    })();

    // 포그라운드 알림 수신
    const sub = Notifications.addNotificationReceivedListener(async (notification) => {
      if (Platform.OS === 'web') return;
      const type = notification.request.content.data?.type as string | undefined;

      // 기상 알람: 포그라운드에서도 Alert으로 알려줌
      if (type === 'wakeup') {
        const body = notification.request.content.body ?? '';
        Alert.alert('기상 시간이에요! ☀️', body || '출발 준비를 시작하세요.');
        return;
      }

      // 피드백 알람: 조용히 표시
      if (type === 'feedback') return;

      // 출발 알람: 중복 방지 (30초 이내 이미 울렸으면 skip)
      const now = Date.now();
      if (now - lastAlarmAt.current < 30_000) return;
      lastAlarmAt.current = now;

      cancelLocalAlarm().catch(() => {});
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

    // 알림 탭
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      stopAlarm();
      const data  = response.notification.request.content.data as Record<string, string> | undefined;
      const type  = data?.type;
      const body  = response.notification.request.content.body ?? '';

      // 피드백 알람 탭 → 바로 피드백 다이얼로그
      if (type === 'feedback' && data?.logId) {
        const logId = Number(data.logId);
        const doFeedback = (diff: number) =>
          submitFeedback(logId, diff).catch(() => Alert.alert('오류', '저장 실패. 통계 탭에서 다시 입력해주세요.'));
        Alert.alert(
          '오늘 출근 결과',
          '도착 목표 시간 기준으로 어떠셨나요?',
          [
            { text: '15분+ 일찍', onPress: () => doFeedback(-15) },
            { text: '5분 일찍',   onPress: () => doFeedback(-5)  },
            { text: '딱 맞게',    onPress: () => doFeedback(0)   },
            { text: '5~10분 늦음', onPress: () => doFeedback(7)  },
            { text: '15분+ 늦음', onPress: () => doFeedback(20)  },
            { text: '취소', style: 'cancel' },
          ],
        );
        return;
      }

      // 기상 알람 탭 → 조용히 닫기
      if (type === 'wakeup') return;

      // 출발 알람 탭 → 스누즈 or 끄기
      Alert.alert(
        '알람을 끄시겠어요?',
        body,
        [
          {
            text: '5분 후 다시 알림',
            onPress: () => {
              Notifications.scheduleNotificationAsync({
                content: { title: '출발할 시간이에요! (스누즈)', body, sound: true, data: { type: 'departure' } },
                trigger: { seconds: 300, channelId: 'alarm' } as any,
              });
            },
          },
          {
            text: '알람 끄기',
            style: 'destructive',
            onPress: () => setAlarmFired(true),
          },
        ],
      );
    });

    return () => {
      sub.remove();
      responseSub.remove();
      stopAlarm();
    };
  }, []);

  return { notifPermission, alarmFired, dismissAlarmBanner };
}
