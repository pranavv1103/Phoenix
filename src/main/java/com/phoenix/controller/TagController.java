package com.phoenix.controller;

import com.phoenix.dto.ApiResponse;
import com.phoenix.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tags")
@RequiredArgsConstructor
public class TagController {

    private final TagRepository tagRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<String>>> getAllTags() {
        List<String> tags = tagRepository.findAllUsedTagNamesSortedByUsage();
        return ResponseEntity.ok(ApiResponse.success("Tags retrieved successfully", tags));
    }
}
