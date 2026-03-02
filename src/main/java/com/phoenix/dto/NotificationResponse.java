package com.phoenix.dto;

import com.phoenix.entity.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    private UUID id;
    private NotificationType type;
    private String actorName;
    private String message;
    private UUID postId;
    private String postTitle;
    private boolean isRead;
    private LocalDateTime createdAt;
}
