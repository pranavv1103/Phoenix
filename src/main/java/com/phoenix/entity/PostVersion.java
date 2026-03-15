package com.phoenix.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Stores the single most-recent previous snapshot of a Post.
 * Every time a post is updated the current content is saved here,
 * overwriting whatever was stored before. This gives authors one
 * level of undo (current ↔ previous).
 */
@Entity
@Table(name = "post_versions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "post_id", nullable = false, unique = true)
    private UUID postId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "cover_image_url", columnDefinition = "TEXT")
    private String coverImageUrl;

    @Column(name = "is_premium", nullable = false)
    @Builder.Default
    private boolean isPremium = false;

    @Column(nullable = false)
    @Builder.Default
    private int price = 0;

    /**
     * Comma-separated tag names, e.g. "java,spring,webdev".
     * Tags are alphanumeric+hyphen only so comma is safe as separator.
     */
    @Column(name = "tags_csv", columnDefinition = "TEXT")
    private String tagsCsv;

    @Column(name = "saved_at", nullable = false)
    private LocalDateTime savedAt;
}
