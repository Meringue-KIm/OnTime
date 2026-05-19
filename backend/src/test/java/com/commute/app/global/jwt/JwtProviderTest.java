package com.commute.app.global.jwt;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JwtProviderTest {

    private JwtProvider jwtProvider;

    @BeforeEach
    void setUp() {
        jwtProvider = new JwtProvider(
                "test-jwt-secret-key-must-be-at-least-256-bits-long-for-hs256",
                1800000L,
                604800000L
        );
    }

    @Test
    @DisplayName("액세스 토큰 생성 후 userId를 추출할 수 있다")
    void createAccessToken_validToken() {
        String token = jwtProvider.createAccessToken(1L);

        assertThat(jwtProvider.isValid(token)).isTrue();
        assertThat(jwtProvider.getUserId(token)).isEqualTo(1L);
    }

    @Test
    @DisplayName("리프레시 토큰 생성 후 userId를 추출할 수 있다")
    void createRefreshToken_validToken() {
        String token = jwtProvider.createRefreshToken(42L);

        assertThat(jwtProvider.isValid(token)).isTrue();
        assertThat(jwtProvider.getUserId(token)).isEqualTo(42L);
    }

    @Test
    @DisplayName("잘못된 토큰은 유효하지 않다")
    void isValid_invalidToken_returnsFalse() {
        assertThat(jwtProvider.isValid("invalid.token.value")).isFalse();
        assertThat(jwtProvider.isValid("")).isFalse();
    }

    @Test
    @DisplayName("다른 키로 서명된 토큰은 유효하지 않다")
    void isValid_tokenSignedWithDifferentKey_returnsFalse() {
        JwtProvider otherProvider = new JwtProvider(
                "other-jwt-secret-key-must-be-at-least-256-bits-long-for-hs256",
                1800000L,
                604800000L
        );
        String token = otherProvider.createAccessToken(1L);

        assertThat(jwtProvider.isValid(token)).isFalse();
    }
}
