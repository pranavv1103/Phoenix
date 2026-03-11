package com.phoenix.controller;

import com.phoenix.dto.ApiResponse;
import com.phoenix.dto.ReactionResponse;
import com.phoenix.entity.ReactionType;
import com.phoenix.service.ReactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class ReactionController {

    private final ReactionService reactionService;

    @PostMapping("/{id}/react")
    public ResponseEntity<ApiResponse<ReactionResponse>> toggleReaction(
            @PathVariable UUID id,
            @RequestParam ReactionType type,
            @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Authentication required to react to a post"));
        }
        ReactionResponse response = reactionService.toggleReaction(id, type, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Reaction toggled successfully", response));
    }

    @GetMapping("/{id}/reactions")
    public ResponseEntity<ApiResponse<ReactionResponse>> getReactions(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails != null ? userDetails.getUsername() : null;
        ReactionResponse response = reactionService.getReactionStatus(id, email);
        return ResponseEntity.ok(ApiResponse.success("Reactions retrieved", response));
    }
}
