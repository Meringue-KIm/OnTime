package com.commute.app.domain.alarm;

import com.commute.app.domain.route.entity.CommuteRoute;
import com.commute.app.domain.route.repository.CommuteRouteRepository;
import com.commute.app.global.weather.WeatherService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class WeatherCacheWarmupScheduler {

    private final CommuteRouteRepository routeRepository;
    private final WeatherService weatherService;

    // 서버 기동 15초 후 첫 실행, 이후 10분마다 정기 실행 (fixedRate = 시작 기준)
    @Scheduled(initialDelay = 15_000, fixedRate = 600_000)
    @Transactional(readOnly = true)
    public void warmupWeatherCache() {
        List<CommuteRoute> routes = routeRepository.findAllByIsActiveTrue();

        // 중복 좌표 제거 (소수점 2자리 기준) — 캐시 키와 동일한 정밀도
        record LatLng(double lat, double lng) {}

        List<LatLng> uniqueLocations = routes.stream()
                .filter(r -> r.getHomeLat() != null && r.getHomeLng() != null)
                .map(r -> new LatLng(
                        Math.round(r.getHomeLat() * 100.0) / 100.0,
                        Math.round(r.getHomeLng() * 100.0) / 100.0))
                .distinct()
                .collect(Collectors.toList());

        log.info("날씨 캐시 워밍업 시작 — 대상 위치 {}곳", uniqueLocations.size());

        for (LatLng loc : uniqueLocations) {
            try {
                weatherService.getWeatherSummary(loc.lat(), loc.lng());
            } catch (Exception e) {
                log.warn("날씨 캐시 워밍업 실패 ({}, {}): {}", loc.lat(), loc.lng(), e.getMessage());
            }
        }

        log.info("날씨 캐시 워밍업 완료");
    }
}
