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
public class SeriesResponse {
    private UUID id;
    private String name;
    private String description;
    private String authorName;
    private String authorEmail;
    private int postCount;
    private LocalDateTime createdAt;
}
