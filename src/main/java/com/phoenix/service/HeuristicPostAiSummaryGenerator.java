package com.phoenix.service;

import com.phoenix.entity.PostAiSummary;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Component
public class HeuristicPostAiSummaryGenerator implements PostAiSummaryGenerator {

    private static final String GENERATOR_VERSION = "heuristic-v1";

    @Override
    public PostAiSummary generate(String title, String markdownContent, int readingTimeMinutes) {
        String plainText = toPlainText(markdownContent);
        String oneSentence = buildOneSentenceSummary(title, plainText);
        List<String> keyTakeaways = buildKeyTakeaways(plainText);
        String difficulty = estimateDifficulty(plainText, readingTimeMinutes);
        String explainSimply = buildExplainSimply(oneSentence, difficulty);

        return PostAiSummary.builder()
                .oneSentenceSummary(oneSentence)
                .keyTakeaways(keyTakeaways)
                .estimatedReadingTimeMinutes(readingTimeMinutes)
                .difficultyLevel(difficulty)
                .explainSimply(explainSimply)
                .generatedAt(LocalDateTime.now())
                .generatorVersion(GENERATOR_VERSION)
                .build();
    }

    private String toPlainText(String markdown) {
        if (markdown == null || markdown.isBlank()) {
            return "";
        }

        String text = markdown
                .replaceAll("```[\\s\\S]*?```", " ")
                .replaceAll("`[^`]*`", " ")
                .replaceAll("!\\[[^\\]]*]\\([^)]*\\)", " ")
                .replaceAll("\\[([^\\]]*)]\\([^)]*\\)", "$1")
                .replaceAll("[#>*_~-]+", " ")
                .replaceAll("\\|", " ")
                .replaceAll("\\s+", " ")
                .trim();

        return text;
    }

    private String buildOneSentenceSummary(String title, String plainText) {
        if (plainText.isBlank()) {
            return "This article introduces " + safeTitle(title) + " with practical context and examples.";
        }

        String[] sentences = plainText.split("(?<=[.!?])\\s+");
        String lead = sentences.length > 0 ? sentences[0].trim() : plainText;
        if (lead.length() > 220) {
            lead = lead.substring(0, 217).trim() + "...";
        }

        if (!lead.endsWith(".") && !lead.endsWith("!") && !lead.endsWith("?")) {
            lead = lead + ".";
        }
        return lead;
    }

    private List<String> buildKeyTakeaways(String plainText) {
        Set<String> uniqueTakeaways = new LinkedHashSet<>();

        String[] sentences = plainText.split("(?<=[.!?])\\s+");
        int idx = 0;
        while (uniqueTakeaways.size() < 5 && idx < sentences.length) {
            String takeaway = cleanTakeaway(sentences[idx]);
            if (!takeaway.isBlank()) {
                uniqueTakeaways.add(takeaway);
            }
            idx++;
        }

        List<String> result = new ArrayList<>(uniqueTakeaways);
        if (result.size() > 5) {
            return result.subList(0, 5);
        }

        if (result.size() < 3) {
            while (result.size() < 3) {
                result.add("Highlights practical concepts that can be applied immediately.");
            }
        }

        return result;
    }

    private String cleanTakeaway(String raw) {
        if (raw == null) {
            return "";
        }
        String value = raw
                .replaceAll("\\s+", " ")
                .replaceAll("^[\\-:;,.\\s]+", "")
                .trim();

        if (value.length() > 180) {
            value = value.substring(0, 177).trim() + "...";
        }

        if (!value.isBlank() && !value.endsWith(".") && !value.endsWith("!") && !value.endsWith("?")) {
            value = value + ".";
        }
        return value;
    }

    private String estimateDifficulty(String plainText, int readingTimeMinutes) {
        int longWords = 0;
        String[] words = plainText.split("\\s+");
        for (String word : words) {
            if (word.length() >= 8) {
                longWords++;
            }
        }

        double longWordRatio = words.length == 0 ? 0.0 : (double) longWords / (double) words.length;

        if (readingTimeMinutes <= 4 && longWordRatio < 0.2) {
            return "Beginner";
        }
        if (readingTimeMinutes <= 9 && longWordRatio < 0.3) {
            return "Intermediate";
        }
        return "Advanced";
    }

    private String buildExplainSimply(String oneSentence, String difficulty) {
        if (oneSentence == null || oneSentence.isBlank()) {
            return null;
        }

        if ("Beginner".equalsIgnoreCase(difficulty)) {
            return null;
        }

        return "In simple words: " + oneSentence;
    }

    private String safeTitle(String title) {
        if (title == null || title.isBlank()) {
            return "the topic";
        }
        return title.trim();
    }
}
