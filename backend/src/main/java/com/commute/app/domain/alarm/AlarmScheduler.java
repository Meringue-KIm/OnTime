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

        List<CommuteRoute> routes = routeRepository.findAllByIsActiveTrue();
        for (CommuteRoute route : routes) {
            if (!route.isActiveDay(todayIndex)) continue;
            String fcmToken = route.getUser().getFcmToken();
            if (fcmToken == null || fcmToken.isBlank()) continue;

            int drivingMinutes = kakaoMapService
                    .getTravelMinutes(route.getHomeLat(), route.getHomeLng(),
                                      route.getWorkLat(), route.getWorkLng(),
                                      route.getTransportMode())
                    .orElse(30);

            Optional<WeatherInfo> weatherOpt = weatherService.getWeather(
                    route.getHomeLat(), route.getHomeLng());
            int weatherBuffer = weatherOpt.map(WeatherInfo::bufferMinutes).orElse(0);

            LocalTime departureTime = route.getArrivalTime()
                    .minusMinutes(drivingMinutes + route.getAlarmBeforeMinutes() + weatherBuffer);

            if (now.equals(departureTime)) {
                String title = "출발할 시간이에요!";
                String body  = buildAlarmBody(drivingMinutes, weatherOpt.orElse(null));
                fcmService.sendPushNotification(fcmToken, title, body);
                log.info("알람 발송 — userId={}, 출발={}", route.getUser().getId(), departureTime);

                // 오늘 로그가 없을 때만 생성 (중복 방지)
                Long userId = route.getUser().getId();
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

    // 매 분마다 실행 — 약속 출발 알람
    @Scheduled(cron = "0 * * * * *")
    @Transactional(readOnly = true)
    public void sendAppointmentAlarms() {
        LocalDateTime now = LocalDateTime.now().withSecond(0).withNano(0);

        List<Appointment> appointments = appointmentRepository
                .findByIsDoneFalseAndAppointmentTimeAfter(now);

        for (Appointment appt : appointments) {
            String fcmToken = appt.getUser().getFcmToken();
            if (fcmToken == null || fcmToken.isBlank()) continue;

            LocalDateTime alarmAt = appt.getAppointmentTime()
                    .minusMinutes(appt.getAlarmBeforeMinutes());

            if (now.equals(alarmAt)) {
                String title = "약속 시간이 다가와요!";
                String body  = appt.getDestAddress() + " — "
                             + appt.getAlarmBeforeMinutes() + "분 후 출발하세요";
                fcmService.sendPushNotification(fcmToken, title, body);
                log.info("약속 알람 발송 — apptId={}, 약속시각={}", appt.getId(), appt.getAppointmentTime());
            }
        }
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
