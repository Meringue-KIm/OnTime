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

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
public class LogController {

    private final CommuteLogRepository logRepository;
    private final CommuteRouteRepository routeRepository;
    private final KakaoMapService kakaoMapService;
    private final WeatherService weatherService;

    @GetMapping("/api/today")
    public ResponseEntity<Map<String, Object>> getToday(@AuthenticationPrincipal Long userId) {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
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
                    if (route.isSkippedToday()) {
                        return ResponseEntity.ok(Map.of("message", "오늘 알람이 건너뛰기로 설정됐습니다."));
                    }

                    int drivingMinutes = kakaoMapService
                            .getTravelMinutes(route.getHomeLat(), route.getHomeLng(),
                                              route.getWorkLat(), route.getWorkLng(),
                                              route.getTransportMode())
                            .orElse(30);

                    Optional<WeatherInfo> weatherOpt = weatherService.getWeather(
                            route.getHomeLat(), route.getHomeLng());
                    int weatherBuffer = weatherOpt.map(WeatherInfo::bufferMinutes).orElse(0);
                    int personalBuffer = calcPersonalBuffer(userId, today.getDayOfWeek());

                    LocalTime recommended = route.getArrivalTime()
                            .minusMinutes(drivingMinutes + route.getAlarmBeforeMinutes() + weatherBuffer + personalBuffer);

                    Map<String, Object> result = new HashMap<>();
                    result.put("recommendedDeparture", recommended);
                    if (personalBuffer != 0) result.put("personalBuffer", personalBuffer);
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

    private int calcPersonalBuffer(Long userId, DayOfWeek dayOfWeek) {
        List<CommuteLog> logs = logRepository.findTop20ByUserIdAndActualDiffMinutesIsNotNullOrderByLogDateDesc(userId);
        if (logs.size() < 3) return 0;

        List<Integer> sameDayDiffs = logs.stream()
                .filter(l -> l.getLogDate().getDayOfWeek() == dayOfWeek)
                .map(CommuteLog::getActualDiffMinutes)
                .collect(Collectors.toList());

        List<Integer> diffs = sameDayDiffs.size() >= 2 ? sameDayDiffs
                : logs.stream().map(CommuteLog::getActualDiffMinutes).collect(Collectors.toList());

        double avg = diffs.stream().mapToInt(i -> i).average().orElse(0);
        return Math.max(-10, Math.min(20, (int) Math.round(avg)));
    }

    @PostMapping("/api/logs/{id}/feedback")
    public ResponseEntity<Void> submitFeedback(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id,
            @RequestBody Map<String, Integer> body) {
        CommuteLog log = logRepository.findById(id)
                .filter(l -> l.getUser().getId().equals(userId))
                .orElseThrow(() -> new IllegalArgumentException("로그를 찾을 수 없습니다."));
        log.submitFeedback(body.get("actualDiffMinutes"));
        logRepository.save(log);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/api/logs")
    public ResponseEntity<List<CommuteLog>> getLogs(@AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(logRepository.findByUserIdOrderByLogDateDesc(userId));
    }
}
