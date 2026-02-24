package com.phoenix.controller;

import com.phoenix.dto.ApiResponse;
import com.phoenix.dto.LikeResponse;
import com.phoenix.service.LikeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/posts")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"})
@RequiredArgsConstructor
public class LikeController {

    private final LikeService likeService;

    @PostMapping("/{id}/like")
    public ResponseEntity<ApiResponse<LikeResponse>> toggleLike(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Authentication required to like a post"));
        }
        LikeResponse response = likeService.toggleLike(id, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Like toggled successfully", response));
    }

    @GetMapping("/{id}/likes")
    public ResponseEntity<ApiResponse<LikeResponse>> getLikes(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails != null ? userDetails.getUsername() : null;
        LikeResponse response = likeService.getLikeStatus(id, email);
        return ResponseEntity.ok(ApiResponse.success("Like status retrieved", response));
    }
}
