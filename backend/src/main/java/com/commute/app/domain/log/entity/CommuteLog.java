package com.commute.app.domain.log.entity;

import com.commute.app.domain.route.entity.CommuteRoute;
import com.commute.app.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "commute_logs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor
public class CommuteLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_id")
    private CommuteRoute route;

    @Column(name = "log_date", nullable = false)
    private LocalDate logDate;

    @Column(name = "recommended_departure")
    private LocalTime recommendedDeparture;

    // null = 피드백 미입력, true = 지각, false = 정시/일찍 도착
    @Column(name = "is_late")
    private Boolean isLate;

    // null = 미입력, 양수 = 늦음(분), 음수 = 일찍 도착(분)
    @Column(name = "actual_diff_minutes")
    private Integer actualDiffMinutes;

    public void submitFeedback(int diffMinutes) {
        this.actualDiffMinutes = diffMinutes;
        this.isLate = diffMinutes > 0;
    }
}
