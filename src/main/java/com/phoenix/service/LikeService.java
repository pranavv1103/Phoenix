package com.phoenix.service;

import com.phoenix.dto.LikeResponse;
import com.phoenix.entity.Like;
import com.phoenix.entity.Post;
import com.phoenix.entity.User;
import com.phoenix.exception.PostNotFoundException;
import com.phoenix.repository.LikeRepository;
import com.phoenix.repository.PostRepository;
import com.phoenix.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LikeService {

    private final LikeRepository likeRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;

    @Transactional
    public LikeResponse toggleLike(UUID postId, String userEmail) {
        Post post = postRepository.findById(Objects.requireNonNull(postId))
                .orElseThrow(() -> new PostNotFoundException("Post not found with id: " + postId));
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        Optional<Like> existingLike = likeRepository.findByPostAndUser(post, user);

        if (existingLike.isPresent()) {
            likeRepository.delete(Objects.requireNonNull(existingLike.get()));
            long newCount = likeRepository.countByPost(post);
            return LikeResponse.builder()
                    .likeCount(newCount)
                    .likedByCurrentUser(false)
                    .build();
        } else {
            Like like = Like.builder()
                    .post(post)
                    .user(user)
                    .build();
            likeRepository.save(Objects.requireNonNull(like));
            long newCount = likeRepository.countByPost(post);
            return LikeResponse.builder()
                    .likeCount(newCount)
                    .likedByCurrentUser(true)
                    .build();
        }
    }

    @Transactional(readOnly = true)
    public LikeResponse getLikeStatus(UUID postId, String userEmail) {
        long count = likeRepository.countByPostId(postId);
        boolean liked = false;
        if (userEmail != null) {
            Optional<User> userOpt = userRepository.findByEmail(userEmail);
            if (userOpt.isPresent()) {
                liked = likeRepository.existsByPostIdAndUserId(postId, userOpt.get().getId());
            }
        }
        return LikeResponse.builder()
                .likeCount(count)
                .likedByCurrentUser(liked)
                .build();
    }
}
