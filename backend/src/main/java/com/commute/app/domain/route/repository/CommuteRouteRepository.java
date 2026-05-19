package com.commute.app.domain.route.repository;

import com.commute.app.domain.route.entity.CommuteRoute;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CommuteRouteRepository extends JpaRepository<CommuteRoute, Long> {
    List<CommuteRoute> findByUserId(Long userId);
    Optional<CommuteRoute> findByIdAndUserId(Long id, Long userId);
    List<CommuteRoute> findByUserIdAndIsActiveTrue(Long userId);
}
