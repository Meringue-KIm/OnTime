package com.commute.app.domain.user.controller;

import com.commute.app.domain.user.dto.FcmTokenRequest;
import com.commute.app.domain.user.dto.LoginRequest;
import com.commute.app.domain.user.dto.RefreshRequest;
import com.commute.app.domain.user.dto.SignupRequest;
import com.commute.app.domain.user.dto.TokenResponse;
import com.commute.app.domain.user.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    public ResponseEntity<Void> signup(@Valid @RequestBody SignupRequest request) {
        authService.signup(request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return ResponseEntity.ok(authService.refresh(request));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        // 클라이언트에서 토큰 삭제로 처리 (추후 Redis 블랙리스트 적용 가능)
        return ResponseEntity.ok().build();
    }

    @PutMapping("/fcmtoken")
    public ResponseEntity<Void> updateFcmToken(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody FcmTokenRequest request) {
        authService.updateFcmToken(userId, request.fcmToken());
        return ResponseEntity.ok().build();
    }
}
