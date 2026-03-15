package com.phoenix.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.JoinColumn;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Embeddable
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostAiSummary {

    @Column(name = "ai_one_sentence_summary", columnDefinition = "TEXT")
    private String oneSentenceSummary;

    @ElementCollection
    @CollectionTable(name = "post_ai_key_takeaways", joinColumns = @JoinColumn(name = "post_id"))
    @Column(name = "takeaway", length = 500)
    @Builder.Default
    private List<String> keyTakeaways = new ArrayList<>();

    @Column(name = "ai_estimated_reading_time_minutes")
    private Integer estimatedReadingTimeMinutes;

    @Column(name = "ai_difficulty_level", length = 32)
    private String difficultyLevel;

    @Column(name = "ai_explain_simply", columnDefinition = "TEXT")
    private String explainSimply;

    @Column(name = "ai_generated_at")
    private LocalDateTime generatedAt;

    @Column(name = "ai_generator_version", length = 64)
    private String generatorVersion;
}
