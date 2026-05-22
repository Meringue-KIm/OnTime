package com.commute.app.domain.appointment.repository;

import com.commute.app.domain.appointment.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByUserIdOrderByAppointmentTimeAsc(Long userId);
    Optional<Appointment> findByIdAndUserId(Long id, Long userId);
    List<Appointment> findByIsDoneFalseAndAppointmentTimeAfter(LocalDateTime now);
    List<Appointment> findByIsDoneFalseAndAppointmentTimeBefore(LocalDateTime now);
}
