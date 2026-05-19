package com.commute.app.domain.route.entity;

import com.commute.app.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalTime;

@Entity
@Table(name = "commute_routes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor
public class CommuteRoute {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "home_address", nullable = false)
    private String homeAddress;

    @Column(name = "home_lat")
    private Double homeLat;

    @Column(name = "home_lng")
    private Double homeLng;

    @Column(name = "work_address", nullable = false)
    private String workAddress;

    @Column(name = "work_lat")
    private Double workLat;

    @Column(name = "work_lng")
    private Double workLng;

    @Column(name = "arrival_time", nullable = false)
    private LocalTime arrivalTime;

    // 알람을 출발 몇 분 전에 울릴지
    @Column(name = "alarm_before_minutes", nullable = false)
    private Integer alarmBeforeMinutes;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    public void update(String homeAddress, Double homeLat, Double homeLng,
                       String workAddress, Double workLat, Double workLng,
                       LocalTime arrivalTime, Integer alarmBeforeMinutes) {
        this.homeAddress = homeAddress;
        this.homeLat = homeLat;
        this.homeLng = homeLng;
        this.workAddress = workAddress;
        this.workLat = workLat;
        this.workLng = workLng;
        this.arrivalTime = arrivalTime;
        this.alarmBeforeMinutes = alarmBeforeMinutes;
    }

    public void deactivate() {
        this.isActive = false;
    }
}
