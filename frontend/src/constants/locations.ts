export const DEFAULT_LOCATION = {
  lat: 37.5665,
  lng: 126.9780,
};

export type City = { name: string; lat: number; lng: number };

export const CITIES: City[] = [
  { name: '서울',   lat: 37.5665, lng: 126.9780 },
  { name: '인천',   lat: 37.4563, lng: 126.7052 },
  { name: '수원',   lat: 37.2636, lng: 127.0286 },
  { name: '성남',   lat: 37.4449, lng: 127.1388 },
  { name: '부산',   lat: 35.1796, lng: 129.0756 },
  { name: '대구',   lat: 35.8714, lng: 128.6014 },
  { name: '대전',   lat: 36.3504, lng: 127.3845 },
  { name: '광주',   lat: 35.1595, lng: 126.8526 },
  { name: '울산',   lat: 35.5384, lng: 129.3114 },
  { name: '제주',   lat: 33.4996, lng: 126.5312 },
];
