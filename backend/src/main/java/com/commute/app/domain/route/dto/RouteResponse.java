package com.commute.app.domain.route.dto;

import com.commute.app.domain.route.entity.CommuteRoute;
import java.time.LocalTime;

public record RouteResponse(
        Long id,
        String homeAddress,
        Double homeLat,
        Double homeLng,
        String workAddress,
        Double workLat,
        Double workLng,
        LocalTime arrivalTime,
        Integer alarmBeforeMinutes,
        Boolean isActive,
        String activeDays,
        String transportMode
) {
    public static RouteResponse from(CommuteRoute route) {
        return new RouteResponse(
                route.getId(),
                route.getHomeAddress(),
                route.getHomeLat(),
                route.getHomeLng(),
                route.getWorkAddress(),
                route.getWorkLat(),
                route.getWorkLng(),
                route.getArrivalTime(),
                route.getAlarmBeforeMinutes(),
                route.getIsActive(),
                route.getActiveDays(),
                route.getTransportMode()
        );
    }
}
