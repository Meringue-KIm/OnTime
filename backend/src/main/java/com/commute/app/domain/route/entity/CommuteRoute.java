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

    // 이동 수단: car, transit, walk
    @Column(name = "transport_mode", nullable = false)
    @Builder.Default
    private String transportMode = "car";

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    // 알람 활성 요일 (프론트 인덱스 기준: 0=일,1=월...6=토), 콤마 구분
    @Column(name = "active_days", nullable = false)
    @Builder.Default
    private String activeDays = "1,2,3,4,5";

    public boolean isActiveDay(int frontendDayIndex) {
        for (String d : activeDays.split(",")) {
            if (d.trim().equals(String.valueOf(frontendDayIndex))) return true;
        }
        return false;
    }

    public void update(String homeAddress, Double homeLat, Double homeLng,
                       String workAddress, Double workLat, Double workLng,
                       LocalTime arrivalTime, Integer alarmBeforeMinutes,
                       String activeDays, String transportMode) {
        this.homeAddress = homeAddress;
        this.homeLat = homeLat;
        this.homeLng = homeLng;
        this.workAddress = workAddress;
        this.workLat = workLat;
        this.workLng = workLng;
        this.arrivalTime = arrivalTime;
        this.alarmBeforeMinutes = alarmBeforeMinutes;
        if (activeDays != null && !activeDays.isBlank()) this.activeDays = activeDays;
        if (transportMode != null && !transportMode.isBlank()) this.transportMode = transportMode;
    }

    public void activate() {
        this.isActive = true;
    }

    public void deactivate() {
        this.isActive = false;
    }
}
