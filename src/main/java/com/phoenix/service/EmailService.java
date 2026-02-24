package com.phoenix.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendPasswordResetEmail(String toEmail, String resetLink) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject("Phoenix Blog - Password Reset Request");
            message.setText(
                "Hello,\n\n" +
                "You requested a password reset for your Phoenix Blog account.\n\n" +
                "Click the link below to reset your password (valid for 1 hour):\n" +
                resetLink + "\n\n" +
                "If you did not request this, please ignore this email.\n\n" +
                "The Phoenix Blog Team"
            );
            mailSender.send(message);
            log.info("Password reset email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send password reset email to {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Failed to send reset email. Please try again later.");
        }
    }
}
