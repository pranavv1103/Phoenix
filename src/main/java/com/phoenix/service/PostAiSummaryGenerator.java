package com.phoenix.service;

import com.phoenix.entity.PostAiSummary;

public interface PostAiSummaryGenerator {
    PostAiSummary generate(String title, String markdownContent, int readingTimeMinutes);
}
