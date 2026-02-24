package com.phoenix.controller;

import com.phoenix.dto.ApiResponse;
import com.phoenix.dto.PostResponse;
import com.phoenix.dto.UserResponse;
import com.phoenix.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/posts")
    public ResponseEntity<ApiResponse<List<PostResponse>>> getAllPosts() {
        List<PostResponse> posts = adminService.getAllPostsForAdmin();
        return ResponseEntity.ok(ApiResponse.success("All posts retrieved successfully", posts));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getAllUsers() {
        List<UserResponse> users = adminService.getAllUsers();
        return ResponseEntity.ok(ApiResponse.success("All users retrieved successfully", users));
    }

    @DeleteMapping("/posts/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePost(@PathVariable @NonNull UUID id) {
        adminService.deletePostAsAdmin(id);
        return ResponseEntity.ok(ApiResponse.success("Post deleted successfully", null));
    }
}
