package com.phoenix.controller;

import com.phoenix.dto.ApiResponse;
import com.phoenix.dto.PostResponse;
import com.phoenix.dto.SeriesRequest;
import com.phoenix.dto.SeriesResponse;
import com.phoenix.service.SeriesService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/series")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"})
@RequiredArgsConstructor
public class SeriesController {

    private final SeriesService seriesService;

    @PostMapping
    public ResponseEntity<ApiResponse<SeriesResponse>> createSeries(@Valid @RequestBody SeriesRequest request) {
        String email = getCurrentUserEmail();
        SeriesResponse created = seriesService.createSeries(request, email);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Series created", created));
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<SeriesResponse>>> getMySeries() {
        String email = getCurrentUserEmail();
        return ResponseEntity.ok(ApiResponse.success("Series retrieved", seriesService.getMySeries(email)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SeriesResponse>> getSeriesById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success("Series retrieved", seriesService.getSeriesById(id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<SeriesResponse>> updateSeries(
            @PathVariable UUID id,
            @Valid @RequestBody SeriesRequest request) {
        String email = getCurrentUserEmail();
        return ResponseEntity.ok(ApiResponse.success("Series updated", seriesService.updateSeries(id, request, email)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSeries(@PathVariable UUID id) {
        String email = getCurrentUserEmail();
        seriesService.deleteSeries(id, email);
        return ResponseEntity.ok(ApiResponse.success("Series deleted", null));
    }

    @GetMapping("/{id}/posts")
    public ResponseEntity<ApiResponse<List<PostResponse>>> getSeriesPosts(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success("Posts retrieved", seriesService.getSeriesPosts(id)));
    }

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
