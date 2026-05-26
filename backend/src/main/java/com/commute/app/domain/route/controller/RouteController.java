package com.commute.app.domain.route.controller;

import com.commute.app.domain.route.dto.RouteRequest;
import com.commute.app.domain.route.dto.RouteResponse;
import com.commute.app.domain.route.entity.CommuteRoute;
import com.commute.app.domain.route.repository.CommuteRouteRepository;
import com.commute.app.domain.route.service.RouteService;
import com.commute.app.global.exception.ErrorMessage;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/routes")
@RequiredArgsConstructor
public class RouteController {

    private final RouteService routeService;
    private final CommuteRouteRepository routeRepository;

    @GetMapping
    public ResponseEntity<List<RouteResponse>> getMyRoutes(@AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(routeService.getMyRoutes(userId));
    }

    @PostMapping
    public ResponseEntity<RouteResponse> createRoute(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody RouteRequest request) {
        return ResponseEntity.ok(routeService.createRoute(userId, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RouteResponse> updateRoute(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id,
            @Valid @RequestBody RouteRequest request) {
        return ResponseEntity.ok(routeService.updateRoute(userId, id, request));
    }

    @PutMapping("/{id}/activate")
    public ResponseEntity<RouteResponse> activateRoute(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id) {
        return ResponseEntity.ok(routeService.activateRoute(userId, id));
    }

    @Transactional
    @PostMapping("/active/skip-today")
    public ResponseEntity<RouteResponse> skipToday(@AuthenticationPrincipal Long userId) {
        List<CommuteRoute> routes = routeRepository.findByUserIdAndIsActiveTrue(userId);
        if (routes.isEmpty()) throw new IllegalArgumentException(ErrorMessage.ROUTE_NOT_FOUND);
        CommuteRoute route = routes.get(0);
        if (route.isSkippedToday()) route.clearSkip(); else route.skipToday();
        return ResponseEntity.ok(RouteResponse.from(routeRepository.save(route)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRoute(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id) {
        routeService.deleteRoute(userId, id);
        return ResponseEntity.ok().build();
    }
}
