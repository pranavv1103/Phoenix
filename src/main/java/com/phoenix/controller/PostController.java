package com.phoenix.controller;

import com.phoenix.dto.ApiResponse;
import com.phoenix.dto.PagedResponse;
import com.phoenix.dto.PostRequest;
import com.phoenix.dto.PostResponse;
import com.phoenix.service.PostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/posts")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"})
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<PostResponse>>> getAllPosts(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String tag,
            @RequestParam(defaultValue = "newest") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "6") int size) {
        PagedResponse<PostResponse> posts;
        if (search != null && !search.trim().isEmpty()) {
            posts = postService.searchPosts(search, page, size, sort, tag);
        } else {
            posts = postService.getAllPosts(page, size, sort, tag);
        }
        return ResponseEntity.ok(ApiResponse.success("Posts retrieved successfully", posts));
    }

    @GetMapping("/my-drafts")
    public ResponseEntity<ApiResponse<List<PostResponse>>> getMyDrafts() {
        return ResponseEntity.ok(ApiResponse.success("Drafts retrieved", postService.getMyDrafts(getCurrentUserEmail())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PostResponse>> getPostById(@PathVariable @NonNull UUID id) {
        PostResponse post = postService.getPostById(id);
        return ResponseEntity.ok(ApiResponse.success("Post retrieved successfully", post));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PostResponse>> createPost(@Valid @RequestBody PostRequest request) {
        String userEmail = getCurrentUserEmail();
        PostResponse post = postService.createPost(request, userEmail);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Post created successfully", post));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PostResponse>> updatePost(
            @PathVariable @NonNull UUID id,
            @Valid @RequestBody PostRequest request) {
        String userEmail = getCurrentUserEmail();
        PostResponse post = postService.updatePost(id, request, userEmail);
        return ResponseEntity.ok(ApiResponse.success("Post updated successfully", post));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePost(@PathVariable @NonNull UUID id) {
        String userEmail = getCurrentUserEmail();
        postService.deletePost(id, userEmail);
        return ResponseEntity.ok(ApiResponse.success("Post deleted successfully", null));
    }

    @GetMapping("/trending")
    public ResponseEntity<ApiResponse<PagedResponse<PostResponse>>> getTrendingPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "6") int size) {
        return ResponseEntity.ok(ApiResponse.success("Trending posts retrieved", postService.getTrendingPosts(page, size)));
    }

    @GetMapping("/following")
    public ResponseEntity<ApiResponse<PagedResponse<PostResponse>>> getFollowingFeed(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "6") int size) {
        return ResponseEntity.ok(ApiResponse.success("Following feed retrieved",
                postService.getFollowingFeed(page, size, getCurrentUserEmail())));
    }

    @GetMapping("/{id}/related")
    public ResponseEntity<ApiResponse<List<PostResponse>>> getRelatedPosts(@PathVariable @NonNull UUID id) {
        return ResponseEntity.ok(ApiResponse.success("Related posts retrieved", postService.getRelatedPosts(id)));
    }

    private String getCurrentUserEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication.getName();
    }
}
