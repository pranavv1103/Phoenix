package com.phoenix.controller;

import com.phoenix.dto.ApiResponse;
import com.phoenix.dto.UserProfileResponse;
import com.phoenix.entity.User;
import com.phoenix.exception.PostNotFoundException;
import com.phoenix.repository.LikeRepository;
import com.phoenix.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"})
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final LikeRepository likeRepository;

    @GetMapping("/{username}")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<UserProfileResponse>> getUserProfile(
            @PathVariable String username,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByName(username)
                .orElseThrow(() -> new PostNotFoundException("User not found with username: " + username));

        String viewerEmail = userDetails != null ? userDetails.getUsername() : null;
        java.util.Optional<User> viewerOpt = viewerEmail != null ? userRepository.findByEmail(viewerEmail) : java.util.Optional.empty();

        var userProfile = UserProfileResponse.builder()
                .username(user.getName())
                .joinedDate(user.getCreatedAt())
                .totalPosts(user.getPosts() != null ? user.getPosts().size() : 0)
                .posts(user.getPosts() != null && !user.getPosts().isEmpty() 
                    ? user.getPosts().stream()
                        .map(post -> {
                            long likeCount = likeRepository.countByPostId(post.getId());
                            boolean liked = viewerOpt.map(v -> likeRepository.existsByPostIdAndUserId(post.getId(), v.getId())).orElse(false);
                            return com.phoenix.dto.PostResponse.builder()
                                .id(post.getId())
                                .title(post.getTitle())
                                .content(post.getContent())
                                .authorName(post.getAuthor().getName())
                                .authorEmail(post.getAuthor().getEmail())
                                .createdAt(post.getCreatedAt())
                                .updatedAt(post.getUpdatedAt())
                                .commentCount(post.getComments() != null ? post.getComments().size() : 0)
                                .likeCount(likeCount)
                                .likedByCurrentUser(liked)
                                .build();
                        })
                        .toList()
                    : java.util.List.of())
                .build();

        return ResponseEntity.ok(ApiResponse.success("User profile retrieved successfully", userProfile));
    }
}
