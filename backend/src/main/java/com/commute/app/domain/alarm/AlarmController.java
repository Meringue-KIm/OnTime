package com.commute.app.domain.alarm;

import com.commute.app.domain.user.entity.User;
import com.commute.app.domain.user.repository.UserRepository;
import com.commute.app.global.exception.ErrorMessage;
import com.commute.app.global.fcm.FcmService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/alarm")
@RequiredArgsConstructor
public class AlarmController {

    private final FcmService fcmService;
    private final UserRepository userRepository;

    @PostMapping("/test")
    public ResponseEntity<String> sendTestAlarm(@AuthenticationPrincipal Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException(ErrorMessage.USER_NOT_FOUND));
        String fcmToken = user.getFcmToken();
        if (fcmToken == null || fcmToken.isBlank()) {
            return ResponseEntity.badRequest().body("FCM 토큰이 등록되지 않았습니다. 앱을 완전히 종료 후 재시작해주세요.");
        }
        fcmService.sendPushNotification(fcmToken, "OnTime 테스트 알람 🔔", "알람 설정이 정상입니다!");
        return ResponseEntity.ok().build();
    }
}
