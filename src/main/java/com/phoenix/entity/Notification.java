package com.phoenix.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "notifications")
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    /** Display name of the person who triggered the notification. */
    @Column(nullable = false)
    private String actorName;

    /** Human-readable message, e.g. "Pranav liked your post". */
    @Column(nullable = false)
    private String message;

    /** Optional link target — post id when relevant. */
    @Column
    private UUID postId;

    /** Optional post title for display in the notification. */
    @Column
    private String postTitle;

    @Column(nullable = false, columnDefinition = "boolean not null default false")
    @Builder.Default
    private boolean isRead = false;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
