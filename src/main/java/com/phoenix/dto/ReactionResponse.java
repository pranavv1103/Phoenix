package com.phoenix.dto;

import com.phoenix.entity.ReactionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReactionResponse {
    private UUID postId;
    private Map<ReactionType, Long> reactionCounts; // e.g., {LIKE: 10, LOVE: 5, CLAP: 3}
    private ReactionType currentUserReaction; // null if user hasn't reacted
    private long totalReactions;
}
