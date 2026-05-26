package com.commute.app.domain.route.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalTime;

public record RouteRequest(
        @NotBlank String homeAddress,
        Double homeLat,
        Double homeLng,
        @NotBlank String workAddress,
        Double workLat,
        Double workLng,
        @NotNull LocalTime arrivalTime,
        @NotNull Integer alarmBeforeMinutes,
        String activeDays,
        String transportMode,
        Integer customTravelMinutes,
        Integer wakeUpBeforeMinutes
) {}
