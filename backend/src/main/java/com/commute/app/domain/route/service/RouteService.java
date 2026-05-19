package com.commute.app.domain.route.service;

import com.commute.app.domain.route.dto.RouteRequest;
import com.commute.app.domain.route.dto.RouteResponse;
import com.commute.app.domain.route.entity.CommuteRoute;
import com.commute.app.domain.route.repository.CommuteRouteRepository;
import com.commute.app.domain.user.entity.User;
import com.commute.app.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RouteService {

    private final CommuteRouteRepository routeRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<RouteResponse> getMyRoutes(Long userId) {
        return routeRepository.findByUserId(userId).stream()
                .map(RouteResponse::from)
                .toList();
    }

    @Transactional
    public RouteResponse createRoute(Long userId, RouteRequest request) {
        User user = userRepository.getReferenceById(userId);
        CommuteRoute route = CommuteRoute.builder()
                .user(user)
                .homeAddress(request.homeAddress())
                .homeLat(request.homeLat())
                .homeLng(request.homeLng())
                .workAddress(request.workAddress())
                .workLat(request.workLat())
                .workLng(request.workLng())
                .arrivalTime(request.arrivalTime())
                .alarmBeforeMinutes(request.alarmBeforeMinutes())
                .build();
        return RouteResponse.from(routeRepository.save(route));
    }

    @Transactional
    public RouteResponse updateRoute(Long userId, Long routeId, RouteRequest request) {
        CommuteRoute route = routeRepository.findByIdAndUserId(routeId, userId)
                .orElseThrow(() -> new IllegalArgumentException("루트를 찾을 수 없습니다."));
        route.update(request.homeAddress(), request.homeLat(), request.homeLng(),
                request.workAddress(), request.workLat(), request.workLng(),
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
