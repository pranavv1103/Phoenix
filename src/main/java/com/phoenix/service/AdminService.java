package com.phoenix.service;

import com.phoenix.dto.PostResponse;
import com.phoenix.dto.UserResponse;
import com.phoenix.entity.Post;
import com.phoenix.entity.User;
import com.phoenix.exception.PostNotFoundException;
import com.phoenix.repository.LikeRepository;
import com.phoenix.repository.PostRepository;
import com.phoenix.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final LikeRepository likeRepository;

    @Transactional(readOnly = true)
    public List<PostResponse> getAllPostsForAdmin() {
        return postRepository.findAllByOrderByCreatedAtDesc(org.springframework.data.domain.Pageable.unpaged())
                .getContent()
                .stream()
                .map(this::convertPostToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::convertUserToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deletePostAsAdmin(@NonNull UUID postId) {
        Post post = postRepository.findById(Objects.requireNonNull(postId))
                .orElseThrow(() -> new PostNotFoundException("Post not found with id: " + postId));
        likeRepository.deleteByPostId(postId);
        postRepository.delete(Objects.requireNonNull(post));
    }

    private PostResponse convertPostToResponse(Post post) {
        return PostResponse.builder()
                .id(post.getId())
                .title(post.getTitle())
                .content(post.getContent())
                .authorName(post.getAuthor().getName())
                .authorEmail(post.getAuthor().getEmail())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .commentCount(post.getComments() != null ? post.getComments().size() : 0)
                .build();
    }

    private UserResponse convertUserToResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .role(user.getRole().name().replace("ROLE_", ""))
                .createdAt(user.getCreatedAt())
                .build();
    }
}
