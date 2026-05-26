package com.commute.app.domain.alarm;

import com.commute.app.domain.appointment.entity.Appointment;
import com.commute.app.domain.appointment.repository.AppointmentRepository;
import com.commute.app.domain.log.entity.CommuteLog;
import com.commute.app.domain.log.repository.CommuteLogRepository;
import com.commute.app.domain.route.entity.CommuteRoute;
import com.commute.app.domain.route.repository.CommuteRouteRepository;
import com.commute.app.global.fcm.FcmService;
import com.commute.app.global.kakao.KakaoMapService;
import com.commute.app.global.weather.WeatherService;
import com.commute.app.global.weather.WeatherService.WeatherInfo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class AlarmScheduler {

    private final CommuteRouteRepository routeRepository;
    private final AppointmentRepository appointmentRepository;
    private final CommuteLogRepository logRepository;
    private final KakaoMapService kakaoMapService;
    private final WeatherService weatherService;
    private final FcmService fcmService;

    // 매 분마다 실행 — 출발 알람 시간이 된 루트에 푸시 알림 발송 + 로그 생성
    @Scheduled(cron = "0 * * * * *")
    @Transactional
    public void sendDepartureAlarms() {
        LocalTime now   = LocalTime.now().withSecond(0).withNano(0);
        LocalDate today = LocalDate.now();

        // 오늘 요일 (프론트 인덱스 기준: 0=일,1=월...6=토)
        int todayIndex = LocalDate.now().getDayOfWeek().getValue() % 7;

        // 분당 1회만 발송 — 복수 루트 활성 시 중복 알람 방지
        java.util.Set<Long> alarmedUsers     = new java.util.HashSet<>();
        java.util.Set<Long> wakeUpAlarmedUsers = new java.util.HashSet<>();

        List<CommuteRoute> routes = routeRepository.findAllByIsActiveTrue();
        for (CommuteRoute route : routes) {
            if (!route.isActiveDay(todayIndex)) continue;
            if (route.isSkippedToday()) continue;
            String fcmToken = route.getUser().getFcmToken();
            if (fcmToken == null || fcmToken.isBlank()) continue;

            int drivingMinutes = (route.getCustomTravelMinutes() != null)
                    ? route.getCustomTravelMinutes()
                    : kakaoMapService.getTravelMinutes(route.getHomeLat(), route.getHomeLng(),
                                                       route.getWorkLat(), route.getWorkLng(),
                                                       route.getTransportMode())
                                     .orElse(30);

            Optional<WeatherInfo> weatherOpt = weatherService.getWeather(
                    route.getHomeLat(), route.getHomeLng());
            int weatherBuffer = weatherOpt.map(WeatherInfo::bufferMinutes).orElse(0);
            int personalBuffer = calcPersonalBuffer(route.getUser().getId());

            LocalTime departureTime = route.getArrivalTime()
                    .minusMinutes(drivingMinutes + route.getAlarmBeforeMinutes() + weatherBuffer + personalBuffer);

            Long userId = route.getUser().getId();

            // 기상 알람
            if (route.getWakeUpBeforeMinutes() != null && !wakeUpAlarmedUsers.contains(userId)) {
                LocalTime wakeUpTime = departureTime.minusMinutes(route.getWakeUpBeforeMinutes());
                if (now.equals(wakeUpTime)) {
                    fcmService.sendPushNotification(fcmToken, "기상 시간이에요! ☀️",
                            "출발까지 " + route.getWakeUpBeforeMinutes() + "분 남았어요. 준비를 시작하세요.",
                            java.util.Map.of("type", "wakeup"));
                    wakeUpAlarmedUsers.add(userId);
                }
            }

            // 출발 알람
            if (now.equals(departureTime) && !alarmedUsers.contains(userId)) {
                String title = "출발할 시간이에요!";
                String body  = buildAlarmBody(drivingMinutes, weatherOpt.orElse(null));
                fcmService.sendPushNotification(fcmToken, title, body,
                        java.util.Map.of("type", "departure"));
                alarmedUsers.add(userId);
                log.info("알람 발송 — userId={}, 출발={}", userId, departureTime);

                // 오늘 로그가 없을 때만 생성 (중복 방지)
                if (logRepository.findByUserIdAndLogDate(userId, today).isEmpty()) {
                    logRepository.save(CommuteLog.builder()
                            .user(route.getUser())
                            .route(route)
                            .logDate(today)
                            .recommendedDeparture(departureTime)
                            .build());
                    log.info("출근 로그 생성 — userId={}, 출발={}", userId, departureTime);
                }
            }
        }
    }

    // 매 분마다 실행 — 약속 출발 알람 (이동 시간 자동 반영)
    @Scheduled(cron = "0 * * * * *")
    @Transactional(readOnly = true)
    public void sendAppointmentAlarms() {
        LocalDateTime now = LocalDateTime.now().withSecond(0).withNano(0);

        List<Appointment> appointments = appointmentRepository
                .findByIsDoneFalseAndAppointmentTimeAfter(now);

        for (Appointment appt : appointments) {
            String fcmToken = appt.getUser().getFcmToken();
            if (fcmToken == null || fcmToken.isBlank()) continue;

            // 출발지 결정: 약속 당일이 활성 요일이고 약속 시각이 출근 도착 시간 이후면 직장, 아니면 집
            int travelMinutes = 0;
            if (appt.getDestLat() != null && appt.getDestLng() != null) {
                List<CommuteRoute> userRoutes = routeRepository.findByUserIdAndIsActiveTrue(appt.getUser().getId());
                if (!userRoutes.isEmpty()) {
                    CommuteRoute activeRoute = userRoutes.get(0);
                    int apptDow = appt.getAppointmentTime().getDayOfWeek().getValue() % 7;
                    boolean workday = activeRoute.isActiveDay(apptDow);
                    boolean afterWork = appt.getAppointmentTime().toLocalTime()
                            .isAfter(activeRoute.getArrivalTime());
                    boolean useWork = workday && afterWork
                            && activeRoute.getWorkLat() != null && activeRoute.getWorkLng() != null;

                    double originLat = useWork ? activeRoute.getWorkLat()  : activeRoute.getHomeLat();
                    double originLng = useWork ? activeRoute.getWorkLng()  : activeRoute.getHomeLng();

                    if (originLat != 0 && originLng != 0) {
                        travelMinutes = kakaoMapService
                                .getTravelMinutes(originLat, originLng,
                                                  appt.getDestLat(), appt.getDestLng(),
                                                  activeRoute.getTransportMode())
                                .orElse(0);
                    }
                }
            }

            LocalDateTime alarmAt = appt.getAppointmentTime()
                    .minusMinutes(appt.getAlarmBeforeMinutes() + travelMinutes);

            if (now.equals(alarmAt)) {
                String title = "약속 시간이 다가와요!";
                String body  = buildAppointmentAlarmBody(appt.getDestAddress(),
                                                         appt.getAlarmBeforeMinutes(), travelMinutes);
                fcmService.sendPushNotification(fcmToken, title, body);
                log.info("약속 알람 발송 — apptId={}, 약속시각={}, 이동={}분", appt.getId(),
                         appt.getAppointmentTime(), travelMinutes);
            }
        }
    }

    // 매 분마다 실행 — 도착 예정 시간 30분 후 피드백 FCM 발송
    @Scheduled(cron = "0 * * * * *")
    @Transactional(readOnly = true)
    public void sendFeedbackRequests() {
        LocalTime now   = LocalTime.now().withSecond(0).withNano(0);
        LocalDate today = LocalDate.now();

        List<CommuteRoute> routes = routeRepository.findAllByIsActiveTrue();
        for (CommuteRoute route : routes) {
            String fcmToken = route.getUser().getFcmToken();
            if (fcmToken == null || fcmToken.isBlank()) continue;

            LocalTime feedbackTime = route.getArrivalTime().plusMinutes(30);
            if (!now.equals(feedbackTime)) continue;

            logRepository.findByUserIdAndLogDate(route.getUser().getId(), today)
                    .ifPresent(commuteLog -> {
                        if (commuteLog.getActualDiffMinutes() != null) return;
                        fcmService.sendPushNotification(
                                fcmToken,
                                "오늘 출근은 어떠셨나요? 😊",
                                "도착 결과를 기록하면 맞춤 알람이 더 정확해져요.",
                                java.util.Map.of("type", "feedback", "logId", String.valueOf(commuteLog.getId())));
                        log.info("피드백 알림 발송 — userId={}", route.getUser().getId());
                    });
        }
    }

    // 매시 정각 — 지난 약속 자동 종료
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void autoClosePastAppointments() {
        LocalDateTime now = LocalDateTime.now();
        List<Appointment> past = appointmentRepository.findByIsDoneFalseAndAppointmentTimeBefore(now);
        past.forEach(Appointment::markDone);
        if (!past.isEmpty()) {
            log.info("과거 약속 자동 종료 — {}건", past.size());
        }
    }

    private String buildAppointmentAlarmBody(String destAddress, int bufferMinutes, int travelMinutes) {
        StringBuilder sb = new StringBuilder();
        sb.append(destAddress).append(" — ");
        if (travelMinutes > 0) {
            sb.append("이동 약 ").append(travelMinutes).append("분");
            if (bufferMinutes > 0) sb.append(" + 여유 ").append(bufferMinutes).append("분");
        } else {
            sb.append(bufferMinutes).append("분 후 출발하세요");
        }
        return sb.toString();
    }

    private int calcPersonalBuffer(Long userId) {
        List<com.commute.app.domain.log.entity.CommuteLog> recentLogs =
                logRepository.findTop7ByUserIdAndActualDiffMinutesIsNotNullOrderByLogDateDesc(userId);
        if (recentLogs.size() < 3) return 0;
        double avg = recentLogs.stream()
                .mapToInt(com.commute.app.domain.log.entity.CommuteLog::getActualDiffMinutes)
                .average().orElse(0);
        return Math.max(-10, Math.min(20, (int) Math.round(avg)));
    }

    private String buildAlarmBody(int drivingMinutes, WeatherInfo weather) {
        StringBuilder sb = new StringBuilder();
        sb.append("이동 시간 약 ").append(drivingMinutes).append("분");
        if (weather != null && weather.bufferMinutes() > 0) {
            sb.append(" | ").append(weather.condition())
              .append("으로 ").append(weather.bufferMinutes()).append("분 여유 추가");
        }
        return sb.toString();
    }
}
