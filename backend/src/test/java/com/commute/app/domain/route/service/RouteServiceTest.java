package com.commute.app.domain.route.service;

import com.commute.app.domain.route.dto.RouteRequest;
import com.commute.app.domain.route.dto.RouteResponse;
import com.commute.app.domain.route.entity.CommuteRoute;
import com.commute.app.domain.route.repository.CommuteRouteRepository;
import com.commute.app.domain.user.entity.User;
import com.commute.app.domain.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class RouteServiceTest {

    @Mock
    private CommuteRouteRepository routeRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private RouteService routeService;

    private User sampleUser() {
        return User.builder().id(1L).email("test@example.com").password("pw").build();
    }

    private RouteRequest sampleRequest() {
        return new RouteRequest("집 주소", 37.5, 127.0, "회사 주소", 37.6, 127.1,
                LocalTime.of(9, 0), 10, null, null);
    }

    private CommuteRoute sampleRoute(User user) {
        return CommuteRoute.builder()
                .id(1L).user(user)
                .homeAddress("집 주소").homeLat(37.5).homeLng(127.0)
                .workAddress("회사 주소").workLat(37.6).workLng(127.1)
                .arrivalTime(LocalTime.of(9, 0)).alarmBeforeMinutes(10)
                .build();
    }

    @Test
    @DisplayName("내 루트 목록을 조회할 수 있다")
    void getMyRoutes_returnsRoutes() {
        User user = sampleUser();
        given(routeRepository.findByUserId(1L)).willReturn(List.of(sampleRoute(user)));

        List<RouteResponse> result = routeService.getMyRoutes(1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).homeAddress()).isEqualTo("집 주소");
    }

    @Test
    @DisplayName("루트를 생성할 수 있다")
    void createRoute_success() {
        User user = sampleUser();
        given(userRepository.getReferenceById(1L)).willReturn(user);
        given(routeRepository.findByUserId(1L)).willReturn(List.of());
        given(routeRepository.save(any())).willReturn(sampleRoute(user));

        RouteResponse result = routeService.createRoute(1L, sampleRequest());

        assertThat(result.homeAddress()).isEqualTo("집 주소");
        assertThat(result.workAddress()).isEqualTo("회사 주소");
    }

    @Test
    @DisplayName("존재하지 않는 루트를 수정하면 예외가 발생한다")
    void updateRoute_notFound_throwsException() {
        given(routeRepository.findByIdAndUserId(99L, 1L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> routeService.updateRoute(1L, 99L, sampleRequest()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("루트를 찾을 수 없습니다.");
    }

    @Test
    @DisplayName("내 루트를 수정하면 변경사항이 반영된다")
    void updateRoute_success_updatesFields() {
        User user = sampleUser();
        CommuteRoute route = CommuteRoute.builder()
                .id(1L).user(user)
                .homeAddress("옛날 집").workAddress("회사 주소")
                .arrivalTime(LocalTime.of(9, 0)).alarmBeforeMinutes(10)
                .build();
        given(routeRepository.findByIdAndUserId(1L, 1L)).willReturn(Optional.of(route));

        RouteResponse result = routeService.updateRoute(1L, 1L, sampleRequest());

        assertThat(result.homeAddress()).isEqualTo("집 주소");
    }

    @Test
    @DisplayName("존재하지 않는 루트를 삭제하면 예외가 발생한다")
    void deleteRoute_notFound_throwsException() {
        given(routeRepository.findByIdAndUserId(99L, 1L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> routeService.deleteRoute(1L, 99L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("루트를 찾을 수 없습니다.");
    }

    @Test
    @DisplayName("루트를 삭제하면 비활성화된다")
    void deleteRoute_deactivatesRoute() {
        User user = sampleUser();
        CommuteRoute route = sampleRoute(user);
        given(routeRepository.findByIdAndUserId(1L, 1L)).willReturn(Optional.of(route));

        routeService.deleteRoute(1L, 1L);

        assertThat(route.getIsActive()).isFalse();
    }
}
