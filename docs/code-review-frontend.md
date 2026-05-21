# 프론트엔드 코드 리뷰

## 1. SRP 위반

### HomeScreen
`HomeScreen.tsx` 한 파일에서 API 호출 + 상태관리 + 푸시 알림 등록 + 데이터 포맷팅 + 렌더링 처리 중.

**개선 방향:**
- `hooks/useNotification.ts` — 푸시 알림 등록 로직
- `hooks/useUpcomingAppointments.ts` — 약속 필터링
- `utils/weather.ts` — 날씨 포맷팅 함수들

### AppointmentScreen
폼 입력 + 목록 렌더링 + 지오코딩 요청이 한 컴포넌트에 혼재.

**개선 방향:**
- `<AppointmentForm>` 컴포넌트 분리
- `<AppointmentList>` 컴포넌트 분리
- `hooks/useAppointmentForm.ts` — 폼 상태 관리

### AlarmScreen
반복 일정 설정 + 여유 시간 설정 + 사운드 설정이 혼재.

**개선 방향:**
- `<AlarmRepeatDays>` 컴포넌트
- `<AlarmBuffer>` 컴포넌트

---

## 2. 하드코딩

| 파일 | 위치 | 내용 | 개선 |
|---|---|---|---|
| `HomeScreen.tsx` | 라인 47 | 서울 좌표 `{ lat: 37.5665, lng: 126.9780 }` | `constants/locations.ts` |
| `AlarmScreen.tsx` | 라인 10 | 요일 배열 `['일','월','화','수','목','금','토']` | `constants/dates.ts` |
| `AlarmScreen.tsx` | 라인 129,133 | 버퍼 min/max/step `0, 60, 5` | `constants/defaults.ts` |
| `RouteScreen.tsx` | 라인 161 | 버퍼 min/max `60, 5` | `constants/defaults.ts` |
| `AppointmentScreen.tsx` | 라인 79 | 알람 기본값 30분 | `constants/defaults.ts` |
| `KakaoMapView.tsx` | 라인 34 | 지도 줌 레벨 `4` | `constants/map.ts` |
| `HomeScreen.tsx` | 라인 118 | 아이콘 매핑 삼항연산자 반복 | `utils/weather.ts` |
| `HomeScreen.tsx` | 라인 164 | `.substring(0, 5)` 시간 슬라이싱 | `utils/time.ts` |

---

## 3. 중복 코드

### 시간 포맷팅
`formatApptTime` 함수가 `HomeScreen.tsx`, `AppointmentScreen.tsx`에 중복 정의됨.

**개선:** `utils/timeFormat.ts`로 통합

### 날씨 아이콘 매핑
`weatherEmoji`, `weatherIconName`, 인라인 삼항연산자가 각각 다른 방식으로 동일한 아이콘 매핑 처리.

**개선:** `utils/weather.ts` 단일 소스로 통합

```typescript
const WEATHER_MAP = {
  sunny:  { emoji: '☀️', icon: 'sunny-outline',  navIcon: 'sunny'  },
  snowy:  { emoji: '❄️', icon: 'snow-outline',   navIcon: 'snow'   },
  cloudy: { emoji: '☁️', icon: 'cloudy-outline', navIcon: 'cloudy' },
  rainy:  { emoji: '🌧', icon: 'rainy-outline',  navIcon: 'rainy'  },
} as const;
```

### 날짜 포맷팅
`StatsScreen.tsx`의 `formatDate`, `getWeekLabel` 등 날짜 포맷팅이 산재.

**개선:** `utils/dateFormat.ts`로 통합

---

## 4. 기타 품질 문제

### LoginScreen — 개발자 모드 코드
`LoginScreen.tsx:60-66` — 개발자 진입 버튼이 조건 없이 렌더링됨.

**개선:** `__DEV__` 조건으로 감싸기
```typescript
{__DEV__ && <TouchableOpacity onPress={...}>...</TouchableOpacity>}
```

### 에러 처리 일관성
`AppointmentScreen.tsx` — 네트워크 에러와 서버 에러를 구분하지 않음.

**개선:** `utils/errors.ts` — `getErrorMessage(error)` 공통 함수

---

## 개선 파일 구조 (권장)

```
src/
  constants/
    defaults.ts     ← 기본값 (버퍼, 알람 시간 등)
    dates.ts        ← 요일, 날짜 관련
    locations.ts    ← 기본 좌표
    map.ts          ← 카카오맵 설정
  utils/
    timeFormat.ts   ← 시간 포맷팅 통합
    weather.ts      ← 날씨 아이콘/이모지 매핑
    colors.ts       ← 색상 유틸
    errors.ts       ← 에러 메시지 처리
  hooks/
    useNotification.ts
    useAppointmentForm.ts
```

## 우선순위

1. **즉시** — `__DEV__` 개발자 모드, `utils/timeFormat.ts` 중복 제거
2. **단기** — constants 파일 분리, `utils/weather.ts` 통합
3. **장기** — 컴포넌트 분리 (AppointmentForm, AlarmBuffer 등)
