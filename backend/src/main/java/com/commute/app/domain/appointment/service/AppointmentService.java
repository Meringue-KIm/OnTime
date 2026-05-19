package com.commute.app.domain.appointment.service;

import com.commute.app.domain.appointment.dto.AppointmentRequest;
import com.commute.app.domain.appointment.dto.AppointmentResponse;
import com.commute.app.domain.appointment.entity.Appointment;
import com.commute.app.domain.appointment.repository.AppointmentRepository;
import com.commute.app.domain.user.entity.User;
import com.commute.app.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getAppointments(Long userId) {
        return appointmentRepository.findByUserIdOrderByAppointmentTimeAsc(userId).stream()
                .map(AppointmentResponse::from)
                .toList();
    }

    @Transactional
    public AppointmentResponse create(Long userId, AppointmentRequest request) {
        User user = userRepository.getReferenceById(userId);
        Appointment appointment = Appointment.builder()
                .user(user)
                .destAddress(request.destAddress())
                .destLat(request.destLat())
                .destLng(request.destLng())
                .appointmentTime(request.appointmentTime())
                .alarmBeforeMinutes(request.alarmBeforeMinutes())
                .build();
        return AppointmentResponse.from(appointmentRepository.save(appointment));
    }

    @Transactional
    public AppointmentResponse update(Long userId, Long id, AppointmentRequest request) {
        Appointment appointment = appointmentRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new IllegalArgumentException("약속을 찾을 수 없습니다."));
        appointment.update(request.destAddress(), request.destLat(), request.destLng(),
                request.appointmentTime(), request.alarmBeforeMinutes());
        return AppointmentResponse.from(appointment);
    }

    @Transactional
    public void delete(Long userId, Long id) {
        Appointment appointment = appointmentRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new IllegalArgumentException("약속을 찾을 수 없습니다."));
        appointmentRepository.delete(appointment);
    }

    @Transactional
    public void markDone(Long userId, Long id) {
        Appointment appointment = appointmentRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new IllegalArgumentException("약속을 찾을 수 없습니다."));
        appointment.markDone();
    }
}
