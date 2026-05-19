package com.commute.app.domain.appointment.dto;

import com.commute.app.domain.appointment.entity.Appointment;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record AppointmentResponse(
        Long id,
        String destAddress,
        Double destLat,
        Double destLng,
        LocalDateTime appointmentTime,
        Integer alarmBeforeMinutes,
        Boolean isDone,
        long dDay
) {
    public static AppointmentResponse from(Appointment appointment) {
        long dDay = LocalDate.now().until(appointment.getAppointmentTime().toLocalDate()).getDays();
        return new AppointmentResponse(
                appointment.getId(),
                appointment.getDestAddress(),
                appointment.getDestLat(),
                appointment.getDestLng(),
                appointment.getAppointmentTime(),
                appointment.getAlarmBeforeMinutes(),
                appointment.getIsDone(),
                dDay
        );
    }
}
