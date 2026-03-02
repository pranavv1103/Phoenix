package com.phoenix.service;

import com.phoenix.dto.NotificationResponse;
import com.phoenix.dto.PagedResponse;
import com.phoenix.entity.Notification;
import com.phoenix.entity.NotificationType;
import com.phoenix.entity.User;
import com.phoenix.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    /**
     * Creates a notification. Skips if recipient and actor are the same user.
     */
    @Transactional
    public void createNotification(User recipient, NotificationType type,
                                   String actorName, String actorEmail,
                                   String message, UUID postId, String postTitle) {
        // Don't notify yourself
        if (recipient.getEmail().equalsIgnoreCase(actorEmail)) {
            return;
        }

        Notification notification = Notification.builder()
                .recipient(recipient)
                .type(type)
                .actorName(actorName)
                .message(message)
                .postId(postId)
                .postTitle(postTitle)
                .build();

        notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public PagedResponse<NotificationResponse> getMyNotifications(String email, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Notification> notifPage = notificationRepository
                .findByRecipient_EmailOrderByCreatedAtDesc(email, pageable);

        List<NotificationResponse> content = notifPage.getContent().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        return PagedResponse.<NotificationResponse>builder()
                .content(content)
                .pageNumber(notifPage.getNumber())
                .pageSize(notifPage.getSize())
                .totalElements(notifPage.getTotalElements())
                .totalPages(notifPage.getTotalPages())
                .first(notifPage.isFirst())
                .last(notifPage.isLast())
                .build();
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(String email) {
        return notificationRepository.countByRecipient_EmailAndIsReadFalse(email);
    }

    @Transactional
    public void markAsRead(UUID id, String email) {
        notificationRepository.markAsRead(id, email);
    }

    @Transactional
    public void markAllAsRead(String email) {
        notificationRepository.markAllAsRead(email);
    }

    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .type(n.getType())
                .actorName(n.getActorName())
                .message(n.getMessage())
                .postId(n.getPostId())
                .postTitle(n.getPostTitle())
                .isRead(n.isRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
