package com.phoenix.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentResponse {
    private UUID id;
    private String content;
    private String authorName;
    private String authorEmail;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID parentId;
    private List<CommentResponse> replies;
}
