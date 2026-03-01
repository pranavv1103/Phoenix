package com.phoenix.service;

import com.phoenix.entity.Post;
import com.phoenix.entity.User;
import com.phoenix.repository.PostRepository;
import com.phoenix.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailDigestService {

    private final JavaMailSender mailSender;
    private final UserRepository userRepository;
    private final PostRepository postRepository;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    /**
     * Scheduled to run every Monday at 9:00 AM
     * Cron: second, minute, hour, day of month, month, day of week
     * 0 0 9 * * MON = 9 AM every Monday
     */
    @Scheduled(cron = "0 0 9 * * MON")
    public void sendWeeklyDigest() {
        log.info("Starting weekly email digest job...");
        
        LocalDateTime oneWeekAgo = LocalDateTime.now().minusWeeks(1);
        List<Post> topPosts = postRepository.findTopPostsSince(oneWeekAgo, PageRequest.of(0, 5));

        if (topPosts.isEmpty()) {
            log.info("No posts from the past week. Skipping digest.");
            return;
        }

        List<User> subscribedUsers = userRepository.findByEmailDigestEnabled(true);
        log.info("Sending digest to {} subscribed users", subscribedUsers.size());

        int successCount = 0;
        int failureCount = 0;

        for (User user : subscribedUsers) {
            try {
                sendDigestEmail(user, topPosts);
                successCount++;
            } catch (Exception e) {
                failureCount++;
                log.error("Failed to send digest to {}: {}", user.getEmail(), e.getMessage());
            }
        }

        log.info("Weekly digest completed. Success: {}, Failed: {}", successCount, failureCount);
    }

    private void sendDigestEmail(User user, List<Post> topPosts) throws MessagingException {
        if (user.getEmail() == null || user.getEmail().isEmpty()) {
            log.warn("User {} has no email address, skipping digest", user.getName());
            return;
        }

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setTo(user.getEmail());
        helper.setSubject("📬 Your Weekly Phoenix Digest");

        String htmlContent = buildDigestHtml(user, topPosts);
        helper.setText(htmlContent, true);

        mailSender.send(message);
        log.debug("Digest sent to {}", user.getEmail());
    }

    private String buildDigestHtml(User user, List<Post> topPosts) {
        StringBuilder html = new StringBuilder();
        String currentWeek = LocalDateTime.now().format(DateTimeFormatter.ofPattern("MMMM d, yyyy"));

        html.append("<!DOCTYPE html>");
        html.append("<html><head><meta charset='UTF-8'></head><body style='font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>");
        
        // Header
        html.append("<div style='text-align: center; padding: 20px 0; border-bottom: 3px solid #10b981;'>");
        html.append("<h1 style='margin: 0; color: #10b981; font-size: 28px;'>🔥 Phoenix Weekly</h1>");
        html.append("<p style='margin: 5px 0 0 0; color: #6b7280; font-size: 14px;'>").append(currentWeek).append("</p>");
        html.append("</div>");

        // Greeting
        html.append("<div style='margin: 30px 0;'>");
        html.append("<p style='font-size: 16px; margin: 0;'>Hi ").append(user.getName()).append(",</p>");
        html.append("<p style='color: #6b7280; margin: 10px 0 0 0;'>Here are the top ").append(topPosts.size()).append(" posts from the past week you might enjoy:</p>");
        html.append("</div>");

        // Post cards
        html.append("<div style='margin: 20px 0;'>");
        for (int i = 0; i < topPosts.size(); i++) {
            Post post = topPosts.get(i);
            String postUrl = frontendUrl + "/posts/" + post.getId();
            String authorUrl = frontendUrl + "/profile/" + post.getAuthor().getName();
            
            html.append("<div style='background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 15px; border-left: 4px solid #10b981;'>");
            
            // Rank badge
            html.append("<div style='display: inline-block; background: #10b981; color: white; font-weight: bold; font-size: 12px; padding: 4px 10px; border-radius: 12px; margin-bottom: 10px;'>");
            html.append("#").append(i + 1);
            html.append("</div>");
            
            // Title
            html.append("<h2 style='margin: 10px 0; font-size: 20px; color: #111827;'>");
            html.append("<a href='").append(postUrl).append("' style='color: #111827; text-decoration: none;'>").append(post.getTitle()).append("</a>");
            html.append("</h2>");
            
            // Metadata
            html.append("<p style='margin: 10px 0; font-size: 13px; color: #6b7280;'>");
            html.append("By <a href='").append(authorUrl).append("' style='color: #10b981; text-decoration: none; font-weight: 600;'>").append(post.getAuthor().getName()).append("</a>");
            html.append(" • ").append(post.getViewCount()).append(" views");
            html.append("</p>");
            
            // Read more button
            html.append("<a href='").append(postUrl).append("' style='display: inline-block; margin-top: 10px; padding: 10px 20px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;'>");
            html.append("Read Post →");
            html.append("</a>");
            
            html.append("</div>");
        }
        html.append("</div>");

        // Footer
        html.append("<div style='margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #9ca3af;'>");
        html.append("<p style='margin: 5px 0;'>You're receiving this because you subscribed to weekly digests.</p>");
        html.append("<p style='margin: 5px 0;'>");
        html.append("<a href='").append(frontendUrl).append("/profile' style='color: #10b981;'>Manage preferences</a>");
        html.append(" | ");
        html.append("<a href='").append(frontendUrl).append("' style='color: #10b981;'>Visit Phoenix</a>");
        html.append("</p>");
        html.append("<p style='margin: 15px 0 5px 0; color: #6b7280;'>&copy; 2026 Phoenix Blog Platform. All rights reserved.</p>");
        html.append("</div>");

        html.append("</body></html>");

        return html.toString();
    }
}
