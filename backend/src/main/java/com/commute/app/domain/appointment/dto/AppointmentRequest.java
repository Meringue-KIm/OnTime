package com.commute.app.domain.appointment.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public record AppointmentRequest(
        String title,
        @NotBlank String destAddress,
        Double destLat,
        Double destLng,
        @NotNull @Future LocalDateTime appointmentTime,
        @NotNull Integer alarmBeforeMinutes
) {}
