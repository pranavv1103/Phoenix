package com.phoenix.service;

import com.phoenix.dto.ReactionResponse;
import com.phoenix.entity.Reaction;
import com.phoenix.entity.ReactionType;
import com.phoenix.entity.NotificationType;
import com.phoenix.entity.Post;
import com.phoenix.entity.User;
import com.phoenix.exception.PostNotFoundException;
import com.phoenix.repository.ReactionRepository;
import com.phoenix.repository.PostRepository;
import com.phoenix.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class ReactionService {

    private final ReactionRepository reactionRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public synchronized ReactionResponse toggleReaction(UUID postId, ReactionType reactionType, String userEmail) {
        Post post = postRepository.findById(Objects.requireNonNull(postId))
                .orElseThrow(() -> new PostNotFoundException("Post not found with id: " + postId));
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        // Use pessimistic locking to prevent race conditions
        Optional<Reaction> existingReaction = reactionRepository.findByPostAndUser(post, user);

        if (existingReaction.isPresent()) {
            Reaction reaction = existingReaction.get();
            if (reaction.getType() == reactionType) {
                // Same reaction - remove ALL reactions for this user-post combination (cleanup)
                reactionRepository.deleteAllByPostIdAndUserId(postId, user.getId());
                reactionRepository.flush(); // Force immediate database sync
                return getReactionStatus(postId, userEmail);
            } else {
                // Different reaction - update it
                reaction.setType(reactionType);
                reactionRepository.save(reaction);
                reactionRepository.flush(); // Force immediate database sync
                createReactionNotification(post, user, reactionType);
                return getReactionStatus(postId, userEmail);
            }
        } else {
            // Check one more time to prevent duplicates (double-check pattern)
            // First clean up any orphaned duplicates
            reactionRepository.deleteAllByPostIdAndUserId(postId, user.getId());
            reactionRepository.flush();
            
            // Now create new reaction
            Reaction reaction = Reaction.builder()
                    .post(post)
                    .user(user)
                    .type(reactionType)
                    .build();
            reactionRepository.save(Objects.requireNonNull(reaction));
            reactionRepository.flush(); // Force immediate database sync
            createReactionNotification(post, user, reactionType);
            return getReactionStatus(postId, userEmail);
        }
    }

    @Transactional(readOnly = true)
    public ReactionResponse getReactionStatus(UUID postId, String userEmail) {
        List<Object[]> reactionData = reactionRepository.countReactionsByType(postId);
        Map<ReactionType, Long> reactionCounts = new HashMap<>();
        long totalReactions = 0;

        // Initialize all reaction types with 0
        for (ReactionType type : ReactionType.values()) {
            reactionCounts.put(type, 0L);
        }

        // Fill in actual counts
        for (Object[] row : reactionData) {
            ReactionType type = (ReactionType) row[0];
            Long count = (Long) row[1];
            reactionCounts.put(type, count);
            totalReactions += count;
        }

        ReactionType currentUserReaction = null;
        if (userEmail != null) {
            Optional<Reaction> userReaction = reactionRepository.findByPostIdAndUserId(
                    postId,
                    userRepository.findByEmail(userEmail)
                            .map(User::getId)
                            .orElse(null)
            );
            currentUserReaction = userReaction.map(Reaction::getType).orElse(null);
        }

        return ReactionResponse.builder()
                .postId(postId)
                .reactionCounts(reactionCounts)
                .currentUserReaction(currentUserReaction)
                .totalReactions(totalReactions)
                .build();
    }

    private void createReactionNotification(Post post, User user, ReactionType reactionType) {
        // Don't notify if user reacts to their own post
        if (Objects.equals(post.getAuthor().getId(), user.getId())) {
            return;
        }

        String reactionEmoji = getReactionEmoji(reactionType);
        String message = user.getName() + " reacted " + reactionEmoji + " to your post \"" + post.getTitle() + "\"";

        notificationService.createNotification(
                post.getAuthor(),
                NotificationType.LIKE, // Reusing LIKE notification type for all reactions
                user.getName(),
                user.getEmail(),
                message,
                post.getId(),
                post.getTitle()
        );
    }

    private String getReactionEmoji(ReactionType type) {
        return switch (type) {
            case LIKE -> "👍";
            case LOVE -> "❤️";
            case CLAP -> "👏";
            case INSIGHTFUL -> "💡";
            case HELPFUL -> "🎯";
            case FIRE -> "🔥";
        };
    }
}
