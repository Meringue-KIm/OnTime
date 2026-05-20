package com.commute.app.domain.alarm;

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

import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class AlarmScheduler {

    private final CommuteRouteRepository routeRepository;
    private final KakaoMapService kakaoMapService;
    private final WeatherService weatherService;
    private final FcmService fcmService;

    // 매 분마다 실행 — 출발 알람 시간이 된 루트에 푸시 알림 발송
    @Scheduled(cron = "0 * * * * *")
    @Transactional(readOnly = true)
    public void sendDepartureAlarms() {
        LocalTime now = LocalTime.now().withSecond(0).withNano(0);

        List<CommuteRoute> routes = routeRepository.findAllByIsActiveTrue();
        for (CommuteRoute route : routes) {
            String fcmToken = route.getUser().getFcmToken();
            if (fcmToken == null || fcmToken.isBlank()) continue;

            int drivingMinutes = kakaoMapService
                    .getDrivingMinutes(route.getHomeLat(), route.getHomeLng(),
                                       route.getWorkLat(), route.getWorkLng())
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
