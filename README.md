# ✈ OnTime

> 스마트 출발 시간 알람 앱 — 실시간 교통 정보와 날씨를 분석해 지각 없는 하루를 만들어드립니다.

---

## 📱 주요 기능

| 화면 | 기능 |
|------|------|
| 대시보드 | 오늘 권장 출발 시간, 날씨, 경로 미리보기, 일정 |
| 루트 | 집/직장 주소 설정, 이동 수단, 도착 목표 시간 |
| 약속 | 약속 등록, 예상 이동 시간, 권장 출발 시간 계산 |
| 알람 | 기상 시간 설정, 반복 요일, AI 스마트 버퍼 |
| 통계 | 정시율 차트, 목표 달성률, 패턴 인사이트 |

---

## 🛠 기술 스택

### Backend
- **Java 17** + **Spring Boot 3.3.5** (Gradle)
- **PostgreSQL 16** — 주 데이터베이스
- **Redis 7** — 캐싱
- **JWT** (jjwt 0.12.6) + Spring Security — 인증
- **Docker Compose** — 로컬 개발 환경

### Frontend
- **React Native** (Expo SDK 54) + **TypeScript**
- **React Navigation** v7 — 탭/스택 네비게이션
- **Zustand** — 상태 관리
- **Axios** — HTTP 통신

### 예정
- 카카오맵 API — 실시간 교통 기반 출발 시간 계산
- 기상청 API — 날씨 기반 여유 시간 조정
- FCM — 푸시 알림
- AWS EC2 + RDS — 배포

---

## 📁 프로젝트 구조

```
OnTime/
├── backend/                  # Spring Boot API 서버
│   ├── src/main/java/com/commute/app/
│   │   ├── domain/
│   │   │   ├── user/         # 인증 (회원가입, 로그인)
│   │   │   ├── route/        # 출근 루트 CRUD
│   │   │   ├── appointment/  # 약속 CRUD
│   │   │   └── log/          # 출퇴근 로그 & 피드백
│   │   └── global/
│   │       ├── jwt/          # JWT 인증 필터
│   │       ├── config/       # Security 설정
│   │       └── exception/    # 전역 예외 처리
│   └── docker-compose.yml    # PostgreSQL + Redis
│
└── frontend/                 # Expo React Native 앱
    └── src/
        ├── screens/          # 5개 메인 화면
        ├── navigation/       # 탭 & 스택 네비게이터
        ├── api/              # Axios 클라이언트, API 함수
        ├── store/            # Zustand 상태 관리
        └── constants/        # 색상 등 공통 상수
```

---

## 🚀 로컬 실행 방법

### 사전 요구사항
- Java 17
- Docker Desktop
- Node.js 18+

### Backend

```bash
# 1. DB 설정 파일 복사 후 값 입력
cp backend/src/main/resources/application-example.yml \
   backend/src/main/resources/application.yml

# 2. PostgreSQL + Redis 실행
cd backend
docker-compose up -d

# 3. Spring Boot 실행
./gradlew bootRun
# → http://localhost:8080
```

### Frontend

```bash
cd frontend
npm install

# 웹 브라우저로 실행
npx expo start --web

# 모바일 (Expo Go 앱 필요)
npx expo start
```

---

## 📡 주요 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/auth/signup` | 회원가입 |
| POST | `/api/auth/login` | 로그인 (JWT 발급) |
| GET | `/api/routes` | 내 출근 루트 목록 |
| POST | `/api/routes` | 루트 등록 |
| GET | `/api/today` | 오늘 권장 출발 시간 |
| GET | `/api/appointments` | 약속 목록 |
| POST | `/api/appointments` | 약속 등록 |
| GET | `/api/logs` | 출퇴근 로그 |

---

## ✅ 테스트

```bash
cd backend
./gradlew test
# 단위 테스트 16개 + 통합 테스트 21개 = 총 37개
```
