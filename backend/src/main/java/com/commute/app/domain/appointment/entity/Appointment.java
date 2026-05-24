package com.commute.app.domain.appointment.entity;

import com.commute.app.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "appointments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "title")
    private String title;

    @Column(name = "dest_address", nullable = false)
    private String destAddress;

    @Column(name = "dest_lat")
    private Double destLat;

    @Column(name = "dest_lng")
    private Double destLng;

    @Column(name = "appointment_time", nullable = false)
    private LocalDateTime appointmentTime;

    @Column(name = "alarm_before_minutes", nullable = false)
    private Integer alarmBeforeMinutes;

    @Column(name = "is_done", nullable = false)
    @Builder.Default
    private Boolean isDone = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public void update(String title, String destAddress, Double destLat, Double destLng,
                       LocalDateTime appointmentTime, Integer alarmBeforeMinutes) {
        this.title = title;
        this.destAddress = destAddress;
        this.destLat = destLat;
        this.destLng = destLng;
        this.appointmentTime = appointmentTime;
        this.alarmBeforeMinutes = alarmBeforeMinutes;
    }

    public void markDone() {
        this.isDone = true;
    }
}
