package com.phoenix.dto;

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
public class PostResponse {
    private UUID id;
    private String title;
    private String content;
    private String authorName;
    private String authorEmail;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private int commentCount;
    private long likeCount;
    private boolean likedByCurrentUser;
}
