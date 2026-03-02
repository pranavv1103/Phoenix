package com.phoenix.service;

import com.phoenix.dto.PostResponse;
import com.phoenix.dto.SeriesRequest;
import com.phoenix.dto.SeriesResponse;
import java.util.Objects;
import com.phoenix.entity.Series;
import com.phoenix.entity.User;
import com.phoenix.exception.UnauthorizedException;
import com.phoenix.repository.PostRepository;
import com.phoenix.repository.SeriesRepository;
import com.phoenix.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SeriesService {

    private final SeriesRepository seriesRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final PostService postService;

    @Transactional
    @SuppressWarnings("null")
    public SeriesResponse createSeries(SeriesRequest request, String userEmail) {
        User author = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        Series series = Series.builder()
                .name(request.getName())
                .description(request.getDescription())
                .author(author)
                .build();

        Series saved = seriesRepository.save(series);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<SeriesResponse> getMySeries(String userEmail) {
        return seriesRepository.findByAuthor_EmailOrderByCreatedAtDesc(userEmail)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public SeriesResponse updateSeries(UUID id, SeriesRequest request, String userEmail) {
        Series series = seriesRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new RuntimeException("Series not found"));

        if (!series.getAuthor().getEmail().equals(userEmail)) {
            throw new UnauthorizedException("Not authorized to update this series");
        }

        series.setName(request.getName());
        series.setDescription(request.getDescription());
        return toResponse(seriesRepository.save(series));
    }

    @Transactional
    public void deleteSeries(UUID id, String userEmail) {
        Series series = seriesRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new RuntimeException("Series not found"));

        if (!series.getAuthor().getEmail().equals(userEmail)) {
            throw new UnauthorizedException("Not authorized to delete this series");
        }

        // Unlink all posts — they become standalone posts
        postRepository.findBySeries_IdOrderBySeriesOrder(id).forEach(post -> {
            post.setSeries(null);
            post.setSeriesOrder(0);
            postRepository.save(post);
        });

        seriesRepository.delete(series);
    }

    @Transactional
    public void deleteSeriesWithPosts(UUID id, String userEmail) {
        Series series = seriesRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new RuntimeException("Series not found"));

        if (!series.getAuthor().getEmail().equals(userEmail)) {
            throw new UnauthorizedException("Not authorized to delete this series");
        }

        // Delete each post (and its likes, comments, bookmarks, etc.) then delete series
        postRepository.findBySeries_IdOrderBySeriesOrder(id)
                .forEach(post -> postService.deletePostInternal(post.getId()));

        seriesRepository.delete(series);
    }

    @Transactional(readOnly = true)
    public List<PostResponse> getSeriesPosts(UUID id) {
        return postRepository.findBySeries_IdOrderBySeriesOrder(id)
                .stream()
                .map(postService::convertToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SeriesResponse getSeriesById(UUID id) {
        Series series = seriesRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new RuntimeException("Series not found"));
        return toResponse(series);
    }

    private SeriesResponse toResponse(Series series) {
        long postCount = postRepository.countBySeries_Id(series.getId());
        return SeriesResponse.builder()
                .id(series.getId())
                .name(series.getName())
                .description(series.getDescription())
                .authorName(series.getAuthor().getName())
                .authorEmail(series.getAuthor().getEmail())
                .postCount((int) postCount)
                .createdAt(series.getCreatedAt())
                .build();
    }
}
