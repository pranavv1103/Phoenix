package com.phoenix.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
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
public class PostVersionResponse {
    private UUID id;
    private UUID postId;
    private String title;
    private String content;
    private String coverImageUrl;
    @JsonProperty("isPremium")
    private boolean isPremium;
    private int price;
    private List<String> tags;
    private LocalDateTime savedAt;
}
