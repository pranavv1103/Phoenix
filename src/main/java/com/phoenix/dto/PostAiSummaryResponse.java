package com.phoenix.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostAiSummaryResponse {
    private String oneSentenceSummary;
    private List<String> keyTakeaways;
    private Integer estimatedReadingTimeMinutes;
    private String difficultyLevel;
    private String explainSimply;
    private LocalDateTime generatedAt;
    private String generatorVersion;
}
