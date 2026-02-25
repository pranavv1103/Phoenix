package com.phoenix.controller;

import com.phoenix.dto.ApiResponse;
import com.phoenix.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tags")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"})
@RequiredArgsConstructor
public class TagController {

    private final TagRepository tagRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<String>>> getAllTags() {
        List<String> tags = tagRepository.findAllUsedTagNamesSortedByUsage();
        return ResponseEntity.ok(ApiResponse.success("Tags retrieved successfully", tags));
    }
}
