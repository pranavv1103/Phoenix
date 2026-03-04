package com.phoenix.controller;

import com.phoenix.dto.ApiResponse;
import com.phoenix.dto.ChangePasswordRequest;
import com.phoenix.dto.UpdateProfileRequest;
import java.util.Objects;
import com.phoenix.dto.UserProfileResponse;
import com.phoenix.entity.User;
import com.phoenix.exception.PostNotFoundException;
import com.phoenix.exception.UnauthorizedException;
import com.phoenix.repository.LikeRepository;
import com.phoenix.repository.UserRepository;
import com.phoenix.service.FollowService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
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
    private final PasswordEncoder passwordEncoder;

    @GetMapping("/{username}")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<UserProfileResponse>> getUserProfile(
            @PathVariable String username,
            @AuthenticationPrincipal UserDetails userDetails) {
        String trimmed = username.trim();
        User user = userRepository.findByName(trimmed)
                .orElseThrow(() -> new PostNotFoundException("User not found with username: " + trimmed));

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
                .email(user.getEmail())
                .bio(user.getBio())
                .avatarUrl(user.getAvatarUrl())
                .websiteUrl(user.getWebsiteUrl())
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
                                .viewCount(post.getViewCount())
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
        boolean nowFollowing = followService.toggleFollow(username.trim(), currentEmail);
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

    @PutMapping("/me")
    @Transactional
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateMyProfile(
            @RequestBody UpdateProfileRequest request) {
        String currentEmail = getCurrentUserEmail();
        User user = userRepository.findByEmail(currentEmail)
                .orElseThrow(() -> new PostNotFoundException("User not found"));

        if (request.getBio() != null) user.setBio(request.getBio().isBlank() ? null : request.getBio().trim());
        if (request.getAvatarUrl() != null) user.setAvatarUrl(request.getAvatarUrl().isBlank() ? null : request.getAvatarUrl().trim());
        if (request.getWebsiteUrl() != null) user.setWebsiteUrl(request.getWebsiteUrl().isBlank() ? null : request.getWebsiteUrl().trim());

        user = userRepository.save(Objects.requireNonNull(user));

        UserProfileResponse profile = UserProfileResponse.builder()
                .username(user.getName())
                .email(user.getEmail())
                .bio(user.getBio())
                .avatarUrl(user.getAvatarUrl())
                .websiteUrl(user.getWebsiteUrl())
                .joinedDate(user.getCreatedAt())
                .totalPosts(0)
                .followersCount(0)
                .followingCount(0)
                .followedByCurrentUser(false)
                .build();
        return ResponseEntity.ok(ApiResponse.success("Profile updated", profile));
    }

    @GetMapping("/digest-preferences")
    public ResponseEntity<ApiResponse<Boolean>> getDigestPreferences() {
        String currentEmail = getCurrentUserEmail();
        User user = userRepository.findByEmail(currentEmail)
                .orElseThrow(() -> new PostNotFoundException("User not found"));
        return ResponseEntity.ok(ApiResponse.success("Digest preferences retrieved", user.isEmailDigestEnabled()));
    }

    @PutMapping("/digest-preferences")
    public ResponseEntity<ApiResponse<Boolean>> updateDigestPreferences(@RequestParam boolean enabled) {
        String currentEmail = getCurrentUserEmail();
        User user = userRepository.findByEmail(currentEmail)
                .orElseThrow(() -> new PostNotFoundException("User not found"));
        user.setEmailDigestEnabled(enabled);
        userRepository.save(user);
        String message = enabled ? "Weekly digest enabled" : "Weekly digest disabled";
        return ResponseEntity.ok(ApiResponse.success(message, enabled));
    }

    @PutMapping("/me/password")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new UnauthorizedException("New passwords do not match");
        }
        String currentEmail = getCurrentUserEmail();
        User user = userRepository.findByEmail(currentEmail)
                .orElseThrow(() -> new PostNotFoundException("User not found"));
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new UnauthorizedException("Current password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(Objects.requireNonNull(user));
        return ResponseEntity.ok(ApiResponse.success("Password changed successfully", null));
    }

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
