import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const ALARM_ID_KEY = 'local_alarm_notification_id';

export async function scheduleLocalAlarm(departureTimeStr: string): Promise<void> {
  if (Platform.OS === 'web') return;

  // 기존 예약 취소
  const existingId = await AsyncStorage.getItem(ALARM_ID_KEY);
  if (existingId) {
    await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
  }

  const [h, m] = departureTimeStr.split(':').map(Number);
  const now = new Date();
  const alarm = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);

  // 이미 지난 시각이면 예약 안 함
  if (alarm <= now) {
    await AsyncStorage.removeItem(ALARM_ID_KEY);
    return;
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '출발할 시간이에요! 🚀',
      body: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} 출발 — OnTime 알람`,
      sound: true,
    },
    trigger: alarm,
  });

  await AsyncStorage.setItem(ALARM_ID_KEY, id);
}

export async function cancelLocalAlarm(): Promise<void> {
  if (Platform.OS === 'web') return;
  const id = await AsyncStorage.getItem(ALARM_ID_KEY);
  if (id) {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    await AsyncStorage.removeItem(ALARM_ID_KEY);
  }
}
