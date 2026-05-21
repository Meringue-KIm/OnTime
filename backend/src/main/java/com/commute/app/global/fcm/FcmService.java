package com.commute.app.global.fcm;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Base64;

@Slf4j
@Service
public class FcmService {

    @Value("${FIREBASE_CREDENTIALS_JSON:}")
    private String firebaseCredentialsJson;

    @PostConstruct
    public void initialize() {
        try {
            InputStream credentialsStream;
            if (firebaseCredentialsJson != null && !firebaseCredentialsJson.isBlank()) {
                credentialsStream = new ByteArrayInputStream(
                        Base64.getMimeDecoder().decode(firebaseCredentialsJson)
                );
            } else {
                credentialsStream = new ClassPathResource("ontime-77adf-firebase-adminsdk-fbsvc-55f04cd693.json").getInputStream();
            }
            GoogleCredentials credentials = GoogleCredentials
                    .fromStream(credentialsStream)
                    .createScoped("https://www.googleapis.com/auth/firebase.messaging");

            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(credentials)
                        .build();
                FirebaseApp.initializeApp(options);
                log.info("Firebase 초기화 완료");
            }
        } catch (IOException e) {
            log.error("Firebase 초기화 실패: {}", e.getMessage());
        }
    }

    public void sendPushNotification(String fcmToken, String title, String body) {
        if (fcmToken == null || fcmToken.isBlank()) return;
        try {
            Message message = Message.builder()
                    .setToken(fcmToken)
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .build();
            String response = FirebaseMessaging.getInstance().send(message);
            log.info("FCM 전송 성공: {}", response);
        } catch (Exception e) {
            log.warn("FCM 전송 실패 (token={}): {}", fcmToken, e.getMessage());
        }
    }
}
