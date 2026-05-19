package com.commute.app.domain.route.controller;

import com.commute.app.domain.route.dto.RouteRequest;
import com.commute.app.domain.route.dto.RouteResponse;
import com.commute.app.domain.route.service.RouteService;
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

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRoute(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id) {
        routeService.deleteRoute(userId, id);
        return ResponseEntity.ok().build();
    }
}
