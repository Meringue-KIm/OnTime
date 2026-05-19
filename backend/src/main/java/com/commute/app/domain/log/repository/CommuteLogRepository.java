package com.commute.app.domain.log.repository;

import com.commute.app.domain.log.entity.CommuteLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface CommuteLogRepository extends JpaRepository<CommuteLog, Long> {
    Optional<CommuteLog> findByUserIdAndLogDate(Long userId, LocalDate logDate);
    List<CommuteLog> findByUserIdOrderByLogDateDesc(Long userId);
}
