import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const DATE_ID_KEY      = 'local_alarm_date_id';
const WEEKLY_IDS_KEY   = 'local_alarm_weekly_ids';   // JSON: {weekday: notifId}
const WEEKLY_TIMES_KEY = 'local_alarm_weekly_times'; // JSON: {weekday: "HH:mm"}

const DEFAULT_TRAVEL_MIN = 30;

function hm(timeStr: string): [number, number] {
  const parts = timeStr.split(':').map(Number);
  return [parts[0], parts[1]];
}

function alarmContent(h: number, m: number) {
  return {
    title: '출발할 시간이에요! 🚀',
    body: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} 출발 — OnTime 알람`,
    sound: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
    data: { type: 'departure' },
  };
}

async function getWeeklyIds(): Promise<Record<number, string>> {
  try {
    const raw = await AsyncStorage.getItem(WEEKLY_IDS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

async function getWeeklyTimes(): Promise<Record<number, string>> {
  try {
    const raw = await AsyncStorage.getItem(WEEKLY_TIMES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

// fetchToday() 성공 시 호출 — 오늘(또는 내일) DATE 알람 예약 + 해당 요일 WEEKLY 갱신
export async function scheduleLocalAlarm(departureTimeStr: string): Promise<void> {
  if (Platform.OS === 'web') return;

  const existingId = await AsyncStorage.getItem(DATE_ID_KEY);
  if (existingId) {
    await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
  }

  const [h, m] = hm(departureTimeStr);
  const now = new Date();
  const alarm = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);

  // 오늘 시각이 이미 지났으면 내일로 예약
  if (alarm <= now) {
    alarm.setDate(alarm.getDate() + 1);
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: alarmContent(h, m),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: alarm,
      channelId: 'alarm',
    } as any,
  });
  await AsyncStorage.setItem(DATE_ID_KEY, id);

  // 해당 요일의 정확한 출발 시각 저장
  const targetWeekday = alarm.getDay();
  const timeKey = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const times = await getWeeklyTimes();
  times[targetWeekday] = timeKey;
  await AsyncStorage.setItem(WEEKLY_TIMES_KEY, JSON.stringify(times));

  // 같은 요일 WEEKLY 알람이 있으면 취소 (DATE와 중복 방지)
  const ids = await getWeeklyIds();
  if (ids[targetWeekday]) {
    await Notifications.cancelScheduledNotificationAsync(ids[targetWeekday]).catch(() => {});
    delete ids[targetWeekday];
    await AsyncStorage.setItem(WEEKLY_IDS_KEY, JSON.stringify(ids));
  }
}

// 루트 저장/활성화 시 호출 — 앱을 열지 않는 날의 폴백 알람
export async function scheduleWeeklyAlarms(
  activeDays: number[],
  arrivalTimeStr: string,
  alarmBeforeMinutes: number,
): Promise<void> {
  if (Platform.OS === 'web') return;

  const oldIds = await getWeeklyIds();
  await Promise.all(
    Object.values(oldIds).map(id =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => {}),
    ),
  );

  const [arrH, arrM] = hm(arrivalTimeStr);
  const estTotalMin = arrH * 60 + arrM - alarmBeforeMinutes - DEFAULT_TRAVEL_MIN;
  const estH = Math.floor(Math.max(0, estTotalMin) / 60);
  const estM = Math.max(0, estTotalMin) % 60;

  const storedTimes = await getWeeklyTimes();
  const todayWeekday = new Date().getDay();
  const newIds: Record<number, string> = {};

  for (const day of activeDays) {
    // 오늘 요일은 DATE 알람이 담당 — 중복 방지
    if (day === todayWeekday) continue;

    const [wh, wm] = storedTimes[day] ? hm(storedTimes[day]) : [estH, estM];

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: alarmContent(wh, wm),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: day + 1, // Expo 기준: 1=일, 2=월, ..., 7=토
          hour: wh,
          minute: wm,
          channelId: 'alarm',
        } as any,
      });
      newIds[day] = id;
    } catch {
      // Expo Go 환경에서는 WEEKLY 트리거 미지원 — EAS Build 후 활성화됨
    }
  }

  await AsyncStorage.setItem(WEEKLY_IDS_KEY, JSON.stringify(newIds));
}

export async function cancelLocalAlarm(): Promise<void> {
  if (Platform.OS === 'web') return;
  const id = await AsyncStorage.getItem(DATE_ID_KEY);
  if (id) {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    await AsyncStorage.removeItem(DATE_ID_KEY);
  }
}

export async function cancelAllAlarms(): Promise<void> {
  if (Platform.OS === 'web') return;
  await cancelLocalAlarm();
  const ids = await getWeeklyIds();
  await Promise.all(
    Object.values(ids).map(id =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => {}),
    ),
  );
  await AsyncStorage.multiRemove([WEEKLY_IDS_KEY, WEEKLY_TIMES_KEY]);
}
