package com.commute.app.domain.log.controller;

import com.commute.app.domain.log.entity.CommuteLog;
import com.commute.app.domain.log.repository.CommuteLogRepository;
import com.commute.app.domain.route.entity.CommuteRoute;
import com.commute.app.domain.route.repository.CommuteRouteRepository;
import com.commute.app.global.kakao.KakaoMapService;
import com.commute.app.global.weather.WeatherService;
import com.commute.app.global.weather.WeatherService.WeatherInfo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequiredArgsConstructor
public class LogController {

    private final CommuteLogRepository logRepository;
    private final CommuteRouteRepository routeRepository;
    private final KakaoMapService kakaoMapService;
    private final WeatherService weatherService;

    @GetMapping("/api/today")
    public ResponseEntity<Map<String, Object>> getToday(@AuthenticationPrincipal Long userId) {
        LocalDate today = LocalDate.now();
        return logRepository.findByUserIdAndLogDate(userId, today)
                .map(log -> ResponseEntity.ok(Map.<String, Object>of(
                        "recommendedDeparture", log.getRecommendedDeparture(),
                        "logDate", log.getLogDate()
                )))
                .orElseGet(() -> {
                    List<CommuteRoute> routes = routeRepository.findByUserIdAndIsActiveTrue(userId);
                    if (routes.isEmpty()) {
                        return ResponseEntity.ok(Map.of("message", "등록된 출근 루트가 없습니다."));
                    }
                    CommuteRoute route = routes.get(0);

                    int drivingMinutes = kakaoMapService
                            .getTravelMinutes(route.getHomeLat(), route.getHomeLng(),
                                              route.getWorkLat(), route.getWorkLng(),
                                              route.getTransportMode())
                            .orElse(30);

                    Optional<WeatherInfo> weatherOpt = weatherService.getWeather(
                            route.getHomeLat(), route.getHomeLng());
                    int weatherBuffer = weatherOpt.map(WeatherInfo::bufferMinutes).orElse(0);

                    LocalTime recommended = route.getArrivalTime()
                            .minusMinutes(drivingMinutes + route.getAlarmBeforeMinutes() + weatherBuffer);

                    Map<String, Object> result = new HashMap<>();
                    result.put("recommendedDeparture", recommended);
                    result.put("arrivalTime", route.getArrivalTime());
                    result.put("drivingMinutes", drivingMinutes);
                    weatherOpt.ifPresent(w -> result.put("weather", Map.of(
                            "condition",    w.condition(),
                            "icon",         w.icon(),
                            "temperature",  w.temperature(),
                            "bufferMinutes", w.bufferMinutes()
                    )));

                    return ResponseEntity.ok(result);
                });
    }

    @PostMapping("/api/logs/{id}/feedback")
    public ResponseEntity<Void> submitFeedback(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> body) {
        CommuteLog log = logRepository.findById(id)
                .filter(l -> l.getUser().getId().equals(userId))
                .orElseThrow(() -> new IllegalArgumentException("로그를 찾을 수 없습니다."));
        log.submitFeedback(body.get("isLate"));
        logRepository.save(log);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/api/logs")
    public ResponseEntity<List<CommuteLog>> getLogs(@AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(logRepository.findByUserIdOrderByLogDateDesc(userId));
    }
}
