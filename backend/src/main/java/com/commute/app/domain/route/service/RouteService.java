package com.commute.app.domain.route.service;

import com.commute.app.domain.route.dto.RouteRequest;
import com.commute.app.domain.route.dto.RouteResponse;
import com.commute.app.domain.route.entity.CommuteRoute;
import com.commute.app.domain.route.repository.CommuteRouteRepository;
import com.commute.app.domain.user.entity.User;
import com.commute.app.domain.user.repository.UserRepository;
import com.commute.app.global.kakao.KakaoMapService;
import com.commute.app.global.kakao.KakaoMapService.Coordinates;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RouteService {

    private final CommuteRouteRepository routeRepository;
    private final UserRepository userRepository;
    private final KakaoMapService kakaoMapService;

    @Transactional(readOnly = true)
    public List<RouteResponse> getMyRoutes(Long userId) {
        return routeRepository.findByUserId(userId).stream()
                .map(RouteResponse::from)
                .toList();
    }

    @Transactional
    public RouteResponse createRoute(Long userId, RouteRequest request) {
        User user = userRepository.getReferenceById(userId);

        Double homeLat = request.homeLat();
        Double homeLng = request.homeLng();
        Double workLat = request.workLat();
        Double workLng = request.workLng();

        if (homeLat == null || homeLng == null) {
            Coordinates c = kakaoMapService.geocode(request.homeAddress()).orElse(null);
            if (c != null) { homeLat = c.lat(); homeLng = c.lng(); }
        }
        if (workLat == null || workLng == null) {
            Coordinates c = kakaoMapService.geocode(request.workAddress()).orElse(null);
            if (c != null) { workLat = c.lat(); workLng = c.lng(); }
        }

        CommuteRoute route = CommuteRoute.builder()
                .user(user)
                .homeAddress(request.homeAddress())
                .homeLat(homeLat)
                .homeLng(homeLng)
                .workAddress(request.workAddress())
                .workLat(workLat)
                .workLng(workLng)
                .arrivalTime(request.arrivalTime())
                .alarmBeforeMinutes(request.alarmBeforeMinutes())
                .build();
        return RouteResponse.from(routeRepository.save(route));
    }

    @Transactional
    public RouteResponse updateRoute(Long userId, Long routeId, RouteRequest request) {
        CommuteRoute route = routeRepository.findByIdAndUserId(routeId, userId)
                .orElseThrow(() -> new IllegalArgumentException("루트를 찾을 수 없습니다."));

        Double homeLat = request.homeLat();
        Double homeLng = request.homeLng();
        Double workLat = request.workLat();
        Double workLng = request.workLng();

        if (homeLat == null || homeLng == null) {
            Coordinates c = kakaoMapService.geocode(request.homeAddress()).orElse(null);
            if (c != null) { homeLat = c.lat(); homeLng = c.lng(); }
        }
        if (workLat == null || workLng == null) {
            Coordinates c = kakaoMapService.geocode(request.workAddress()).orElse(null);
            if (c != null) { workLat = c.lat(); workLng = c.lng(); }
        }

        route.update(request.homeAddress(), homeLat, homeLng,
                request.workAddress(), workLat, workLng,
                request.arrivalTime(), request.alarmBeforeMinutes());
        return RouteResponse.from(route);
    }

    @Transactional
    public void deleteRoute(Long userId, Long routeId) {
        CommuteRoute route = routeRepository.findByIdAndUserId(routeId, userId)
                .orElseThrow(() -> new IllegalArgumentException("루트를 찾을 수 없습니다."));
        route.deactivate();
    }
}
