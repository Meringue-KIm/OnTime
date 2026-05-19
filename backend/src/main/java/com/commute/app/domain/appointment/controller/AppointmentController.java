package com.commute.app.domain.appointment.controller;

import com.commute.app.domain.appointment.dto.AppointmentRequest;
import com.commute.app.domain.appointment.dto.AppointmentResponse;
import com.commute.app.domain.appointment.service.AppointmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    @GetMapping
    public ResponseEntity<List<AppointmentResponse>> getAppointments(@AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(appointmentService.getAppointments(userId));
    }

    @PostMapping
    public ResponseEntity<AppointmentResponse> create(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody AppointmentRequest request) {
        return ResponseEntity.ok(appointmentService.create(userId, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AppointmentResponse> update(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id,
            @Valid @RequestBody AppointmentRequest request) {
        return ResponseEntity.ok(appointmentService.update(userId, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id) {
        appointmentService.delete(userId, id);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/done")
    public ResponseEntity<Void> markDone(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id) {
        appointmentService.markDone(userId, id);
        return ResponseEntity.ok().build();
    }
}
