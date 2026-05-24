package com.commute.app.global.mail;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Async
    public void sendPasswordResetCode(String to, String code) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setTo(to);
            helper.setSubject("[OnTime] 비밀번호 재설정 코드");
            helper.setText(buildEmailBody(code), true);
            mailSender.send(message);
        } catch (Exception e) {
            throw new RuntimeException("이메일 발송에 실패했습니다.", e);
        }
    }

    private String buildEmailBody(String code) {
        return """
                <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9f9f9;border-radius:12px;">
                  <h2 style="color:#2D6A4F;margin-bottom:8px;">OnTime 비밀번호 재설정</h2>
                  <p style="color:#555;margin-bottom:24px;">아래 6자리 코드를 앱에 입력하세요. 코드는 <b>10분</b> 후 만료됩니다.</p>
                  <div style="background:#2D6A4F;color:#fff;font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;border-radius:8px;">
                    %s
                  </div>
                  <p style="color:#999;font-size:12px;margin-top:24px;">본인이 요청하지 않은 경우 이 이메일을 무시하세요.</p>
                </div>
                """.formatted(code);
    }
}
