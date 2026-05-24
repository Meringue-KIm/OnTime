package com.commute.app.domain.user.service;

import com.commute.app.domain.user.dto.LoginRequest;
import com.commute.app.domain.user.dto.RefreshRequest;
import com.commute.app.domain.user.dto.SignupRequest;
import com.commute.app.domain.user.dto.TokenResponse;
import com.commute.app.domain.user.entity.User;
import com.commute.app.domain.user.repository.UserRepository;
import com.commute.app.global.exception.ErrorMessage;
import com.commute.app.global.jwt.JwtProvider;
import com.commute.app.global.mail.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final StringRedisTemplate redisTemplate;
    private final EmailService emailService;

    private static final String RESET_PREFIX = "pwd_reset:";
    private static final Duration RESET_TTL  = Duration.ofMinutes(10);

    @Transactional
    public void signup(SignupRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
        }
        User user = User.builder()
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .build();
        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public TokenResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new IllegalArgumentException(ErrorMessage.INVALID_CREDENTIALS));
        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new IllegalArgumentException(ErrorMessage.INVALID_CREDENTIALS);
        }
        return new TokenResponse(
                jwtProvider.createAccessToken(user.getId()),
                jwtProvider.createRefreshToken(user.getId())
        );
    }

    @Transactional(readOnly = true)
    public TokenResponse refresh(RefreshRequest request) {
        if (!jwtProvider.isValid(request.refreshToken())) {
            throw new IllegalArgumentException("만료되었거나 유효하지 않은 Refresh Token입니다.");
        }
        Long userId = jwtProvider.getUserId(request.refreshToken());
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException(ErrorMessage.USER_NOT_FOUND));
        return new TokenResponse(
                jwtProvider.createAccessToken(userId),
                jwtProvider.createRefreshToken(userId)
        );
    }

    @Transactional
    public void updateFcmToken(Long userId, String fcmToken) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException(ErrorMessage.USER_NOT_FOUND));
        user.updateFcmToken(fcmToken);
    }

    @Transactional
    public void changePassword(Long userId, String currentPassword, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException(ErrorMessage.USER_NOT_FOUND));
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new IllegalArgumentException("현재 비밀번호가 일치하지 않습니다.");
        }
        user.changePassword(passwordEncoder.encode(newPassword));
    }

    @Transactional
    public void deleteAccount(Long userId) {
        userRepository.deleteById(userId);
    }

    public void forgotPassword(String email) {
        // 존재하지 않는 이메일도 동일 응답 (계정 존재 여부 노출 방지)
        if (!userRepository.existsByEmail(email)) return;

        String code = String.format("%06d", new SecureRandom().nextInt(1_000_000));
        redisTemplate.opsForValue().set(RESET_PREFIX + email, code, RESET_TTL);
        emailService.sendPasswordResetCode(email, code);
    }

    @Transactional
    public void resetPassword(String email, String code, String newPassword) {
        String stored = redisTemplate.opsForValue().get(RESET_PREFIX + email);
        if (stored == null || !stored.equals(code)) {
            throw new IllegalArgumentException("인증 코드가 올바르지 않거나 만료되었습니다.");
        }
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException(ErrorMessage.USER_NOT_FOUND));
        user.changePassword(passwordEncoder.encode(newPassword));
        redisTemplate.delete(RESET_PREFIX + email);
    }
}
