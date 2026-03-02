package com.phoenix.service;

import com.phoenix.entity.Follow;
import com.phoenix.entity.NotificationType;
import com.phoenix.entity.User;
import com.phoenix.exception.PostNotFoundException;
import com.phoenix.repository.FollowRepository;
import com.phoenix.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FollowService {

    private final FollowRepository followRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    /**
     * Toggle follow on a user. Returns true if now following, false if unfollowed.
     */
    @Transactional
    @SuppressWarnings("null")
    public boolean toggleFollow(String targetUsername, String currentUserEmail) {
        User follower = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new PostNotFoundException("User not found"));
        User following = userRepository.findByName(targetUsername)
                .orElseThrow(() -> new PostNotFoundException("User not found: " + targetUsername));

        if (follower.getId().equals(following.getId())) {
            throw new IllegalArgumentException("You cannot follow yourself");
        }

        if (followRepository.existsByFollowerIdAndFollowingId(follower.getId(), following.getId())) {
            followRepository.deleteByFollowerIdAndFollowingId(follower.getId(), following.getId());
            return false;
        } else {
            followRepository.save(Follow.builder().follower(follower).following(following).build());
            notificationService.createNotification(
                    following,
                    NotificationType.FOLLOW,
                    follower.getName(),
                    follower.getEmail(),
                    follower.getName() + " started following you",
                    null,
                    null);
            return true;
        }
    }

    public boolean isFollowing(String targetUsername, String currentUserEmail) {
        User follower = userRepository.findByEmail(currentUserEmail).orElse(null);
        User following = userRepository.findByName(targetUsername).orElse(null);
        if (follower == null || following == null) return false;
        return followRepository.existsByFollowerIdAndFollowingId(follower.getId(), following.getId());
    }

    public long getFollowersCount(String username) {
        return userRepository.findByName(username)
                .map(u -> followRepository.countByFollowingId(u.getId()))
                .orElse(0L);
    }

    public long getFollowingCount(String username) {
        return userRepository.findByName(username)
                .map(u -> followRepository.countByFollowerId(u.getId()))
                .orElse(0L);
    }
}
