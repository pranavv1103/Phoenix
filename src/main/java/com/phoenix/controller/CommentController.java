package com.phoenix.controller;

import com.phoenix.dto.ApiResponse;
import com.phoenix.dto.CommentRequest;
import com.phoenix.dto.CommentResponse;
import com.phoenix.dto.PagedResponse;
import com.phoenix.service.CommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/posts/{postId}/comments")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"})
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<CommentResponse>>> getCommentsByPostId(
            @PathVariable @NonNull UUID postId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PagedResponse<CommentResponse> comments = commentService.getCommentsByPostId(postId, page, size);
        return ResponseEntity.ok(ApiResponse.success("Comments retrieved successfully", comments));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CommentResponse>> createComment(
            @PathVariable @NonNull UUID postId,
            @Valid @RequestBody CommentRequest request) {
        String userEmail = getCurrentUserEmail();
        CommentResponse comment = commentService.createComment(postId, request, userEmail);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Comment created successfully", comment));
    }

    @PutMapping("/{commentId}")
    public ResponseEntity<ApiResponse<CommentResponse>> updateComment(
            @PathVariable @NonNull UUID postId,
            @PathVariable @NonNull UUID commentId,
            @Valid @RequestBody CommentRequest request) {
        String userEmail = getCurrentUserEmail();
        CommentResponse updated = commentService.updateComment(commentId, request, userEmail);
        return ResponseEntity.ok(ApiResponse.success("Comment updated successfully", updated));
    }

    @DeleteMapping("/{commentId}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable @NonNull UUID postId,
            @PathVariable @NonNull UUID commentId) {
        String userEmail = getCurrentUserEmail();
        commentService.deleteComment(commentId, userEmail);
        return ResponseEntity.ok(ApiResponse.success("Comment deleted successfully", null));
    }

    private String getCurrentUserEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication.getName();
    }
}
