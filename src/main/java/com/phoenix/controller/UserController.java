package com.phoenix.controller;

import com.phoenix.dto.ApiResponse;
import com.phoenix.dto.UserProfileResponse;
import com.phoenix.entity.User;
import com.phoenix.exception.PostNotFoundException;
import com.phoenix.repository.LikeRepository;
import com.phoenix.repository.UserRepository;
import com.phoenix.service.FollowService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
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
    private final FollowService followService;

    @GetMapping("/{username}")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<UserProfileResponse>> getUserProfile(
            @PathVariable String username,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByName(username)
                .orElseThrow(() -> new PostNotFoundException("User not found with username: " + username));

        String viewerEmail = userDetails != null ? userDetails.getUsername() : null;
        java.util.Optional<User> viewerOpt = viewerEmail != null ? userRepository.findByEmail(viewerEmail) : java.util.Optional.empty();

        java.util.List<com.phoenix.entity.Post> publishedPosts = user.getPosts() != null
                ? user.getPosts().stream()
                    .filter(p -> p.getStatus() == null || p.getStatus() == com.phoenix.entity.PostStatus.PUBLISHED)
                    .toList()
                : java.util.List.of();

        long followersCount = followService.getFollowersCount(username);
        long followingCount = followService.getFollowingCount(username);
        boolean followedByCurrentUser = viewerEmail != null && followService.isFollowing(username, viewerEmail);

        var userProfile = UserProfileResponse.builder()
                .username(user.getName())
                .joinedDate(user.getCreatedAt())
                .totalPosts(publishedPosts.size())
                .followersCount(followersCount)
                .followingCount(followingCount)
                .followedByCurrentUser(followedByCurrentUser)
                .posts(!publishedPosts.isEmpty()
                    ? publishedPosts.stream()
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
                                .status("PUBLISHED")
                                .build();
                        })
                        .toList()
                    : java.util.List.of())
                .build();

        return ResponseEntity.ok(ApiResponse.success("User profile retrieved successfully", userProfile));
    }

    @PostMapping("/{username}/follow")
    public ResponseEntity<ApiResponse<Boolean>> toggleFollow(@PathVariable String username) {
        String currentEmail = getCurrentUserEmail();
        boolean nowFollowing = followService.toggleFollow(username, currentEmail);
        String msg = nowFollowing ? "Now following " + username : "Unfollowed " + username;
        return ResponseEntity.ok(ApiResponse.success(msg, nowFollowing));
    }

    @GetMapping("/{username}/follow-status")
    public ResponseEntity<ApiResponse<Boolean>> getFollowStatus(@PathVariable String username) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean following = auth != null && auth.isAuthenticated()
                && !auth.getPrincipal().equals("anonymousUser")
                && followService.isFollowing(username, auth.getName());
        return ResponseEntity.ok(ApiResponse.success("Follow status retrieved", following));
    }

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
