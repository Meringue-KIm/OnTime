# 백엔드 코드 리뷰

## 1. SRP 위반

### AlarmScheduler
`AlarmScheduler.java` 한 클래스에서 스케줄링 + 경로 조회 + 카카오 API 호출 + 날씨 조회 + 메시지 생성 + FCM 발송 처리 중.

**개선 방향:**
- `AlarmCalculator` — 출발 시간 계산
- `AlarmMessageBuilder` — 메시지 생성
- `AlarmService` — 비즈니스 로직 조율
- `AlarmScheduler` — 스케줄 트리거만

### WeatherService
`WeatherService.java` 에서 좌표 변환 + 기상청 API 호출 + 날씨 코드 매핑 + 데이터 조합 모두 처리 중.

**개선 방향:**
- `LambertProjectionConverter` — 좌표 변환
- `WeatherCodeMapper` — 날씨 코드 해석
- `KmaWeatherClient` — 기상청 API 호출만

### RouteService
`RouteService.java:41-48, 74-81` — `createRoute`, `updateRoute`에서 지오코딩 로직 중복.

**개선:** 지오코딩 공통 메서드로 추출

---

## 2. 하드코딩

| 파일 | 위치 | 내용 | 개선 |
|---|---|---|---|
| `FcmService.java` | 라인 36 | Firebase JSON 파일명 하드코딩 | `@Value`로 분리 |
| `AlarmScheduler.java` | 라인 43 | 기본 주행시간 30분 매직넘버 | `application.yml`로 분리 |
| `AlarmScheduler.java` | 라인 53-54 | 알림 제목/메시지 하드코딩 | `application.yml`로 분리 |
| `WeatherService.java` | 라인 26-33 | Lambert 투영 상수 하드코딩 | `@ConfigurationProperties`로 분리 |
| `WeatherService.java` | 라인 78 | 기상청 예보 기준 시간 배열 하드코딩 | `application.yml`로 분리 |
| `KakaoMapService.java` | 라인 27, 51 | API 엔드포인트 URL 하드코딩 | `application.yml`로 분리 |

---

## 3. 기타 품질 문제

### 예외 처리
- `GlobalExceptionHandler.java` — `IllegalArgumentException`만 처리, 도메인 예외 없음
- `MethodArgumentNotValidException` 처리 시 첫 번째 에러만 반환
- 사용자 정의 예외 클래스 없음 (`ResourceNotFoundException`, `DuplicateEmailException` 등)

### 중복 에러 메시지
- `AuthService.java:37,39` — "이메일 또는 비밀번호가 올바르지 않습니다." 2회
- `AppointmentService.java:46,55,62` — "약속을 찾을 수 없습니다." 3회
- `RouteService.java:67,92` — "루트를 찾을 수 없습니다." 2회

**개선:** `ErrorMessage` 상수 클래스 생성

### AuthController
`/fcmtoken` 엔드포인트에서 `Map<String, String>` 직접 사용 → `null` 방어 없음.

**개선:** `FcmTokenRequest` record로 교체 + `@Valid` 검증

### SecurityConfig
`config.setAllowedOriginPatterns(List.of("*"))` — 모든 오리진 허용.

**개선:** 운영 시 `CORS_ALLOWED_ORIGINS` 환경변수로 제한

---

## 우선순위

1. **즉시** — `ErrorMessage` 상수 클래스, `FcmTokenRequest` DTO
2. **단기** — `AlarmScheduler` 책임 분리, `WeatherService` 분리
3. **장기** — `@ConfigurationProperties` 설정 분리, CORS 보안 강화
