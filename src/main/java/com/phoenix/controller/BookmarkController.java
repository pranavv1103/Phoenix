package com.phoenix.controller;

import com.phoenix.dto.ApiResponse;
import com.phoenix.dto.PostResponse;
import com.phoenix.service.BookmarkService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/bookmarks")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"})
@RequiredArgsConstructor
public class BookmarkController {

    private final BookmarkService bookmarkService;

    @PostMapping("/{postId}")
    public ResponseEntity<ApiResponse<Boolean>> toggleBookmark(@PathVariable UUID postId) {
        boolean saved = bookmarkService.toggleBookmark(postId, getCurrentUserEmail());
        String msg = saved ? "Post bookmarked" : "Bookmark removed";
        return ResponseEntity.ok(ApiResponse.success(msg, saved));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<PostResponse>>> getMyBookmarks() {
        return ResponseEntity.ok(ApiResponse.success("Bookmarks retrieved", bookmarkService.getMyBookmarks(getCurrentUserEmail())));
    }

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
