package com.commute.app.domain.user.service;

import com.commute.app.domain.user.dto.LoginRequest;
import com.commute.app.domain.user.dto.SignupRequest;
import com.commute.app.domain.user.dto.TokenResponse;
import com.commute.app.domain.user.entity.User;
import com.commute.app.domain.user.repository.UserRepository;
import com.commute.app.global.jwt.JwtProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtProvider jwtProvider;

    @InjectMocks
    private AuthService authService;

    @Test
    @DisplayName("이미 존재하는 이메일로 가입하면 예외가 발생한다")
    void signup_duplicateEmail_throwsException() {
        given(userRepository.existsByEmail("test@example.com")).willReturn(true);

        assertThatThrownBy(() -> authService.signup(new SignupRequest("test@example.com", "password123")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("이미 사용 중인 이메일입니다.");
    }

    @Test
    @DisplayName("정상 회원가입 시 User가 저장된다")
    void signup_success_savesUser() {
        given(userRepository.existsByEmail("test@example.com")).willReturn(false);
        given(passwordEncoder.encode("password123")).willReturn("encodedPw");

        authService.signup(new SignupRequest("test@example.com", "password123"));

        then(userRepository).should().save(any(User.class));
    }

    @Test
    @DisplayName("존재하지 않는 이메일로 로그인하면 예외가 발생한다")
    void login_emailNotFound_throwsException() {
        given(userRepository.findByEmail("test@example.com")).willReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new LoginRequest("test@example.com", "password123")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("이메일 또는 비밀번호가 올바르지 않습니다.");
    }

    @Test
    @DisplayName("비밀번호가 틀리면 예외가 발생한다")
    void login_wrongPassword_throwsException() {
        User user = User.builder()
                .id(1L).email("test@example.com").password("encodedPw").build();
        given(userRepository.findByEmail("test@example.com")).willReturn(Optional.of(user));
        given(passwordEncoder.matches("wrongPw", "encodedPw")).willReturn(false);

        assertThatThrownBy(() -> authService.login(new LoginRequest("test@example.com", "wrongPw")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("이메일 또는 비밀번호가 올바르지 않습니다.");
    }

    @Test
    @DisplayName("올바른 자격증명으로 로그인하면 토큰이 반환된다")
    void login_success_returnsTokens() {
        User user = User.builder()
                .id(1L).email("test@example.com").password("encodedPw").build();
        given(userRepository.findByEmail("test@example.com")).willReturn(Optional.of(user));
        given(passwordEncoder.matches("password123", "encodedPw")).willReturn(true);
        given(jwtProvider.createAccessToken(1L)).willReturn("access-token");
        given(jwtProvider.createRefreshToken(1L)).willReturn("refresh-token");

        TokenResponse response = authService.login(new LoginRequest("test@example.com", "password123"));

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.refreshToken()).isEqualTo("refresh-token");
    }
}
