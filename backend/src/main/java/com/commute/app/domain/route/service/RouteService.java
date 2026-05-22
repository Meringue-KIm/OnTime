package com.commute.app.domain.route.service;

import com.commute.app.domain.route.dto.RouteRequest;
import com.commute.app.domain.route.dto.RouteResponse;
import com.commute.app.domain.route.entity.CommuteRoute;
import com.commute.app.domain.route.repository.CommuteRouteRepository;
import com.commute.app.domain.user.entity.User;
import com.commute.app.domain.user.repository.UserRepository;
import com.commute.app.global.exception.ErrorMessage;
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

    private double[] resolveCoordinates(Double lat, Double lng, String address) {
        if (lat != null && lng != null) return new double[]{lat, lng};
        return kakaoMapService.geocode(address)
                .map(c -> new double[]{c.lat(), c.lng()})
                .orElse(new double[]{0.0, 0.0});
    }

    @Transactional
    public RouteResponse createRoute(Long userId, RouteRequest request) {
        User user = userRepository.getReferenceById(userId);

        // 새 루트를 활성화하면서 기존 활성 루트를 모두 비활성화
        routeRepository.findByUserId(userId).forEach(CommuteRoute::deactivate);

        double[] home = resolveCoordinates(request.homeLat(), request.homeLng(), request.homeAddress());
        double[] work = resolveCoordinates(request.workLat(), request.workLng(), request.workAddress());
        Double homeLat = home[0] != 0.0 ? home[0] : null;
        Double homeLng = home[1] != 0.0 ? home[1] : null;
        Double workLat = work[0] != 0.0 ? work[0] : null;
        Double workLng = work[1] != 0.0 ? work[1] : null;

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
                .activeDays(request.activeDays() != null ? request.activeDays() : "1,2,3,4,5")
                .transportMode(request.transportMode() != null ? request.transportMode() : "car")
                .build();
        return RouteResponse.from(routeRepository.save(route));
    }

    @Transactional
    public RouteResponse activateRoute(Long userId, Long routeId) {
        routeRepository.findByUserId(userId).forEach(CommuteRoute::deactivate);
        CommuteRoute route = routeRepository.findByIdAndUserId(routeId, userId)
                .orElseThrow(() -> new IllegalArgumentException(ErrorMessage.ROUTE_NOT_FOUND));
        route.activate();
        return RouteResponse.from(route);
    }

    @Transactional
    public RouteResponse updateRoute(Long userId, Long routeId, RouteRequest request) {
        CommuteRoute route = routeRepository.findByIdAndUserId(routeId, userId)
                .orElseThrow(() -> new IllegalArgumentException(ErrorMessage.ROUTE_NOT_FOUND));

        double[] home = resolveCoordinates(request.homeLat(), request.homeLng(), request.homeAddress());
        double[] work = resolveCoordinates(request.workLat(), request.workLng(), request.workAddress());
        Double homeLat = home[0] != 0.0 ? home[0] : null;
        Double homeLng = home[1] != 0.0 ? home[1] : null;
        Double workLat = work[0] != 0.0 ? work[0] : null;
        Double workLng = work[1] != 0.0 ? work[1] : null;

        route.update(request.homeAddress(), homeLat, homeLng,
                request.workAddress(), workLat, workLng,
                request.arrivalTime(), request.alarmBeforeMinutes(),
                request.activeDays(), request.transportMode());
        return RouteResponse.from(route);
    }

    @Transactional
    public void deleteRoute(Long userId, Long routeId) {
        CommuteRoute route = routeRepository.findByIdAndUserId(routeId, userId)
                .orElseThrow(() -> new IllegalArgumentException(ErrorMessage.ROUTE_NOT_FOUND));
        route.deactivate();
    }
}
