package com.phoenix.service;

import com.phoenix.dto.PagedResponse;
import com.phoenix.dto.PostAiSummaryResponse;
import com.phoenix.dto.PostRequest;
import com.phoenix.dto.PostResponse;
import com.phoenix.dto.PostVersionResponse;
import com.phoenix.entity.Post;
import com.phoenix.entity.PostVersion;
import com.phoenix.entity.PostAiSummary;
import com.phoenix.entity.PostStatus;
import com.phoenix.entity.Reaction;
import com.phoenix.entity.ReactionType;
import com.phoenix.entity.Series;
import com.phoenix.entity.Tag;
import com.phoenix.entity.User;
import com.phoenix.entity.UserRole;
import com.phoenix.exception.PostNotFoundException;
import com.phoenix.exception.UnauthorizedException;
import com.phoenix.repository.BookmarkRepository;
import com.phoenix.repository.CommentRepository;
import com.phoenix.repository.FollowRepository;
import com.phoenix.repository.LikeRepository;
import com.phoenix.repository.PaymentRepository;
import com.phoenix.repository.PostRepository;
import com.phoenix.repository.PostVersionRepository;
import com.phoenix.repository.PostViewRepository;
import com.phoenix.entity.PostView;
import com.phoenix.repository.ReactionRepository;
import com.phoenix.repository.SeriesRepository;
import com.phoenix.repository.TagRepository;
import com.phoenix.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.lang.NonNull;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final LikeRepository likeRepository;
    private final ReactionRepository reactionRepository;
    private final BookmarkRepository bookmarkRepository;
    private final CommentRepository commentRepository;
    private final PaymentRepository paymentRepository;
    private final PostViewRepository postViewRepository;
    private final TagRepository tagRepository;
    private final FollowRepository followRepository;
    private final SeriesRepository seriesRepository;
    private final PostAiSummaryGenerator postAiSummaryGenerator;
    private final PostVersionRepository postVersionRepository;

    @Transactional
    public PagedResponse<PostResponse> getAllPosts(int page, int size, String sort, String tag) {
        LocalDateTime now = utcNow();
        Page<Post> postPage;
        if (tag != null && !tag.trim().isEmpty()) {
            String t = tag.trim().toLowerCase();
            if (isMostLiked(sort)) {
                postPage = postRepository.findByTagNameOrderByLikeCountDesc(t, now, PageRequest.of(page, size));
            } else {
                postPage = postRepository.findVisibleByTag(t, now, buildPageable(page, size, sort));
            }
        } else if (isMostLiked(sort)) {
            postPage = postRepository.findAllOrderByLikeCountDesc(now, PageRequest.of(page, size));
        } else {
            postPage = postRepository.findVisible(now, buildPageable(page, size, sort));
        }
        return buildPagedResponse(postPage);
    }

    @Transactional
    public PagedResponse<PostResponse> searchPosts(String query, int page, int size, String sort, String tag) {
        if (query == null || query.trim().isEmpty()) {
            return getAllPosts(page, size, sort, tag);
        }

        Pageable pageable = buildPageable(page, size, sort);
        LocalDateTime now = utcNow();
        Page<Post> postPage;

        if (tag != null && !tag.trim().isEmpty()) {
            String t = tag.trim().toLowerCase();
            if (isMostLiked(sort)) {
                postPage = postRepository.findByTitleContainingIgnoreCaseAndTagNameOrderByLikeCountDesc(
                        query.trim(), t, now, PageRequest.of(page, size));
            } else {
                postPage = postRepository.findVisibleByTitleAndTag(query.trim(), t, now, pageable);
            }
        } else if (isMostLiked(sort)) {
            postPage = postRepository.findByTitleContainingIgnoreCaseOrderByLikeCountDesc(query.trim(), now, PageRequest.of(page, size));
        } else {
            postPage = postRepository.findVisibleByTitle(query.trim(), now, pageable);
        }

        return buildPagedResponse(postPage);
    }

    private @NonNull Pageable buildPageable(int page, int size, String sort) {
        Sort sortSpec = Sort.by("createdAt").descending();
        if (isOldest(sort)) {
            sortSpec = Sort.by("createdAt").ascending();
        }
        return PageRequest.of(page, size, sortSpec);
    }

    private boolean isMostLiked(String sort) {
        return "mostLiked".equalsIgnoreCase(sort);
    }

    private boolean isOldest(String sort) {
        return "oldest".equalsIgnoreCase(sort);
    }

    private PagedResponse<PostResponse> buildPagedResponse(Page<Post> postPage) {
        List<PostResponse> content = postPage.getContent().stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());

        return PagedResponse.<PostResponse>builder()
                .content(content)
                .pageNumber(postPage.getNumber())
                .pageSize(postPage.getSize())
                .totalElements(postPage.getTotalElements())
                .totalPages(postPage.getTotalPages())
                .first(postPage.isFirst())
                .last(postPage.isLast())
                .build();
    }

    @Transactional
    public PostResponse getPostById(@NonNull UUID id) {
        Post post = postRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new PostNotFoundException("Post not found with id: " + id));

        publishIfDue(post);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User currentUser = null;
        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            currentUser = userRepository.findByEmail(auth.getName()).orElse(null);
        }

        boolean isAuthorOrAdmin = currentUser != null
                && (post.getAuthor().getId().equals(currentUser.getId()) || currentUser.getRole() == UserRole.ROLE_ADMIN);
        if (!isPubliclyVisible(post) && !isAuthorOrAdmin) {
            throw new PostNotFoundException("Post not found with id: " + id);
        }

        // Count only unique views per authenticated user
        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            User viewer = currentUser;
            if (viewer != null && !postViewRepository.existsByPostIdAndUserId(post.getId(), viewer.getId())) {
                PostView view = PostView.builder()
                        .postId(post.getId())
                        .userId(viewer.getId())
                        .build();
                postViewRepository.save(Objects.requireNonNull(view));
                post.setViewCount(post.getViewCount() + 1);
                postRepository.save(post);
            }
        }

        return convertToResponse(post);
    }

    @Transactional
    public PostResponse createPost(PostRequest request, String userEmail) {
        User author = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        Series series = null;
        if (request.getSeriesId() != null) {
            series = seriesRepository.findById(Objects.requireNonNull(request.getSeriesId())).orElse(null);
        }

        Post post = Post.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .isPremium(request.isPremium())
                .price(request.getPrice())
                .author(author)
                .coverImageUrl(request.getCoverImageUrl())
                .series(series)
                .seriesOrder(request.getSeriesOrder())
                .build();

        applyPublishingState(post, request);

        if (request.getTags() != null && !request.getTags().isEmpty()) {
            post.setTags(resolveOrCreateTags(request.getTags()));
        }

        refreshAiSummary(post);

        Post savedPost = postRepository.save(Objects.requireNonNull(post));
        return convertToResponse(savedPost);
    }

    @Transactional
    public PostResponse updatePost(@NonNull UUID id, PostRequest request, String userEmail) {
        Post post = postRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new PostNotFoundException("Post not found with id: " + id));

        if (!post.getAuthor().getEmail().equals(userEmail)) {
            throw new UnauthorizedException("You are not authorized to update this post");
        }

        // Snapshot the persisted state before mutating the entity so the
        // previous-version record actually contains the old content.
        snapshotCurrentVersion(post);

        post.setTitle(request.getTitle());
        post.setContent(request.getContent());
        post.setPremium(request.isPremium());
        post.setPrice(request.getPrice());
        applyPublishingState(post, request);
        if (request.getCoverImageUrl() != null) {
            post.setCoverImageUrl(request.getCoverImageUrl());
        }

        post.getTags().clear();
        if (request.getTags() != null && !request.getTags().isEmpty()) {
            post.getTags().addAll(resolveOrCreateTags(request.getTags()));
        }

        // Update series
        if (request.getSeriesId() != null) {
            Series series = seriesRepository.findById(Objects.requireNonNull(request.getSeriesId())).orElse(null);
            post.setSeries(series);
        } else {
            post.setSeries(null);
        }
        post.setSeriesOrder(request.getSeriesOrder());

        refreshAiSummary(post);

        Post updatedPost = postRepository.save(post);
        return convertToResponse(updatedPost);
    }

    @Transactional
    public void deletePost(@NonNull UUID id, String userEmail) {
        Post post = postRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new PostNotFoundException("Post not found with id: " + id));

        User currentUser = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        boolean isAuthor = post.getAuthor().getEmail().equals(userEmail);
        boolean isAdmin = currentUser.getRole() == UserRole.ROLE_ADMIN;

        if (!isAuthor && !isAdmin) {
            throw new UnauthorizedException("You are not authorized to delete this post");
        }

        bookmarkRepository.deleteByPostId(id);
        paymentRepository.deleteByPostId(id);
        postViewRepository.deleteByPostId(id);
        likeRepository.deleteByPostId(id);
        commentRepository.deleteRepliesByPostId(id);
        commentRepository.deleteByPostId(id);
        postVersionRepository.deleteByPostId(id);
        postRepository.delete(post);
    }

    /**
     * Internal delete — bypasses author/admin check. Used by SeriesService when
     * deleting a whole series (series ownership is verified at that level).
     */
    @Transactional
    public void deletePostInternal(@NonNull UUID id) {
        Post post = postRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new PostNotFoundException("Post not found with id: " + id));
        bookmarkRepository.deleteByPostId(id);
        paymentRepository.deleteByPostId(id);
        postViewRepository.deleteByPostId(id);
        likeRepository.deleteByPostId(id);
        commentRepository.deleteRepliesByPostId(id);
        commentRepository.deleteByPostId(id);
        postVersionRepository.deleteByPostId(id);
        postRepository.delete(Objects.requireNonNull(post));
    }

    @Transactional
    public List<PostResponse> getMyDrafts(String userEmail) {
        return postRepository.findDraftAndScheduledByAuthorEmail(userEmail, utcNow())
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Scheduled(cron = "0 * * * * *")
    @Transactional
    public void publishScheduledPosts() {
        LocalDateTime now = utcNow();

        // New behavior: future-scheduled posts stay DRAFT until due.
        List<Post> dueScheduledDrafts = postRepository.findByStatusAndScheduledPublishAtLessThanEqual(PostStatus.DRAFT, now);
        for (Post post : dueScheduledDrafts) {
            post.setStatus(PostStatus.PUBLISHED);
            post.setScheduledPublishAt(null);
        }

        // Backward compatibility for older records created as PUBLISHED+future.
        List<Post> dueLegacyPublished = postRepository.findByStatusAndScheduledPublishAtLessThanEqual(PostStatus.PUBLISHED, now);
        for (Post post : dueLegacyPublished) {
            post.setScheduledPublishAt(null);
        }

        if (!dueScheduledDrafts.isEmpty()) {
            postRepository.saveAll(dueScheduledDrafts);
        }
        if (!dueLegacyPublished.isEmpty()) {
            postRepository.saveAll(dueLegacyPublished);
        }
    }

    @Transactional
    public PagedResponse<PostResponse> getTrendingPosts(int page, int size) {
        Page<Post> postPage = postRepository.findAllOrderByLikeCountDesc(utcNow(), PageRequest.of(page, size));
        return buildPagedResponse(postPage);
    }

    @Transactional
    public PagedResponse<PostResponse> getFollowingFeed(int page, int size, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        List<UUID> followingIds = followRepository.findFollowingIdsByFollowerId(user.getId());
        if (followingIds.isEmpty()) {
            return PagedResponse.<PostResponse>builder()
                    .content(List.of())
                    .pageNumber(page)
                    .pageSize(size)
                    .totalElements(0)
                    .totalPages(0)
                    .first(true)
                    .last(true)
                    .build();
        }
        Page<Post> postPage = postRepository.findByAuthorIdIn(followingIds, utcNow(), PageRequest.of(page, size));
        return buildPagedResponse(postPage);
    }

    @Transactional
    public List<PostResponse> getRelatedPosts(@NonNull UUID id) {
        Post post = postRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new PostNotFoundException("Post not found with id: " + id));
        List<String> tagNames = post.getTags().stream()
                .map(com.phoenix.entity.Tag::getName)
                .collect(Collectors.toList());

        LocalDateTime now = utcNow();
        // Try tag-based related posts first (up to 4)
        List<Post> related = tagNames.isEmpty()
                ? List.of()
                : postRepository.findRelatedPosts(tagNames, id, now, PageRequest.of(0, 4));

        // Fallback: show recent published posts if no tag matches found
        if (related.isEmpty()) {
            related = postRepository.findRecentPostsExcluding(id, now, PageRequest.of(0, 3));
        }

        return related.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    PostResponse convertToResponse(Post post) {
        long likeCount = likeRepository.countByPostId(post.getId());
        boolean likedByCurrentUser = false;
        boolean paidByCurrentUser = false;
        boolean isAuthor = false;

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User currentUser = null;
        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            currentUser = userRepository.findByEmail(auth.getName()).orElse(null);
        }

        // Get reaction data
        java.util.Map<ReactionType, Long> reactionCounts = new java.util.HashMap<>();
        for (ReactionType type : ReactionType.values()) {
            reactionCounts.put(type, 0L);
        }
        ReactionType currentUserReaction = null;
        long totalReactions = 0;

        List<Object[]> reactionData = reactionRepository.countReactionsByType(post.getId());
        for (Object[] row : reactionData) {
            ReactionType type = (ReactionType) row[0];
            Long count = (Long) row[1];
            reactionCounts.put(type, count);
            totalReactions += count;
        }

        if (currentUser != null) {
            final UUID userId = currentUser.getId();
            likedByCurrentUser = likeRepository.existsByPostIdAndUserId(post.getId(), userId);
            isAuthor = post.getAuthor().getId().equals(userId);
            if (post.isPremium() && !isAuthor) {
                paidByCurrentUser = paymentRepository
                        .existsByPost_IdAndUser_IdAndStatus(post.getId(), userId, "COMPLETED");
            }
            
            // Get current user's reaction
            java.util.Optional<Reaction> userReaction = reactionRepository.findByPostIdAndUserId(post.getId(), userId);
            currentUserReaction = userReaction.map(Reaction::getType).orElse(null);
        }

        boolean bookmarkedByCurrentUser = currentUser != null
                && bookmarkRepository.existsByUserIdAndPostId(currentUser.getId(), post.getId());

        // Gate premium content: hide full content from non-paying / non-author users
        String fullContent = post.getContent();
        String content = fullContent;
        if (post.isPremium() && !isAuthor && !paidByCurrentUser) {
            content = "";
        }

        // Compute reading time from full content (avg 200 words/min)
        int wordCount = fullContent == null || fullContent.isBlank() ? 0 :
                fullContent.trim().split("\\s+").length;
        int readingTimeMinutes = Math.max(1, (int) Math.ceil(wordCount / 200.0));

        // Keep a stable AI summary payload. For older posts, compute once lazily.
        PostAiSummary summary = post.getAiSummary();
        if (summary == null || summary.getOneSentenceSummary() == null || summary.getOneSentenceSummary().isBlank()) {
            refreshAiSummary(post);
            summary = post.getAiSummary();
            postRepository.save(post);
        }

        List<String> tagNames = (post.getTags() != null)
                ? post.getTags().stream().map(Tag::getName).collect(Collectors.toList())
                : new ArrayList<>();

        // Series fields
        java.util.UUID seriesId = null;
        String seriesName = null;
        int seriesOrder = 0;
        int seriesSize = 0;
        Series postSeries = post.getSeries();
        if (postSeries != null) {
            seriesId = postSeries.getId();
            seriesName = postSeries.getName();
            seriesOrder = post.getSeriesOrder();
            seriesSize = (int) postRepository.countBySeries_Id(Objects.requireNonNull(seriesId));
        }

        boolean scheduledForFuture = post.getScheduledPublishAt() != null
            && post.getScheduledPublishAt().isAfter(utcNow());
        String responseStatus = post.getStatus() == PostStatus.DRAFT
            ? (scheduledForFuture ? "SCHEDULED" : PostStatus.DRAFT.name())
            : (scheduledForFuture ? "SCHEDULED" : PostStatus.PUBLISHED.name());

        return PostResponse.builder()
                .id(post.getId())
                .title(post.getTitle())
                .content(content)
                .authorName(post.getAuthor().getName())
                .authorEmail(post.getAuthor().getEmail())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .commentCount((int) commentRepository.countByPostId(post.getId()))
                .likeCount(likeCount)
                .likedByCurrentUser(likedByCurrentUser)
                // Reaction data
                .reactionCounts(reactionCounts)
                .currentUserReaction(currentUserReaction)
                .totalReactions(totalReactions)
                .isPremium(post.isPremium())
                .price(post.getPrice())
                .paidByCurrentUser(paidByCurrentUser)
                .author(isAuthor)
                .viewCount(post.getViewCount())
                .readingTimeMinutes(readingTimeMinutes)
                .tags(tagNames)
                .status(responseStatus)
                .scheduledPublishAt(post.getScheduledPublishAt())
                .bookmarkedByCurrentUser(bookmarkedByCurrentUser)
                .coverImageUrl(post.getCoverImageUrl())
                .seriesId(seriesId)
                .seriesName(seriesName)
                .seriesOrder(seriesOrder)
                .seriesSize(seriesSize)
                .aiSummary(toAiSummaryResponse(summary, readingTimeMinutes))
                .build();
    }

    // -------------------------------------------------------------------------
    // Version History
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public PostVersionResponse getPreviousVersion(UUID postId, String userEmail) {
        Post post = postRepository.findById(Objects.requireNonNull(postId))
                .orElseThrow(() -> new PostNotFoundException("Post not found with id: " + postId));
        if (!post.getAuthor().getEmail().equals(userEmail)) {
            throw new UnauthorizedException("Not authorized to view version history");
        }
        return postVersionRepository.findByPostId(postId)
                .map(this::toVersionResponse)
                .orElse(null);
    }

    @Transactional
    public PostResponse restoreVersion(UUID postId, String userEmail) {
        Post post = postRepository.findById(Objects.requireNonNull(postId))
                .orElseThrow(() -> new PostNotFoundException("Post not found with id: " + postId));
        if (!post.getAuthor().getEmail().equals(userEmail)) {
            throw new UnauthorizedException("Not authorized to restore version");
        }

        PostVersion version = postVersionRepository.findByPostId(postId)
                .orElseThrow(() -> new IllegalStateException("No previous version found for this post"));

        // Read old snapshot fields before overwriting
        String oldTitle       = version.getTitle();
        String oldContent     = version.getContent();
        String oldCoverImage  = version.getCoverImageUrl();
        boolean oldIsPremium  = version.isPremium();
        int     oldPrice      = version.getPrice();
        String  oldTagsCsv    = version.getTagsCsv();

        // Swap: save current post state into the version record
        List<String> currentTagNames = post.getTags().stream()
                .map(Tag::getName).collect(Collectors.toList());
        version.setTitle(post.getTitle());
        version.setContent(post.getContent());
        version.setCoverImageUrl(post.getCoverImageUrl());
        version.setPremium(post.isPremium());
        version.setPrice(post.getPrice());
        version.setTagsCsv(String.join(",", currentTagNames));
        version.setSavedAt(LocalDateTime.now());
        postVersionRepository.save(version);

        // Apply old snapshot into post
        post.setTitle(oldTitle);
        post.setContent(oldContent);
        post.setCoverImageUrl(oldCoverImage);
        post.setPremium(oldIsPremium);
        post.setPrice(oldPrice);
        post.getTags().clear();
        if (oldTagsCsv != null && !oldTagsCsv.isBlank()) {
            post.getTags().addAll(resolveOrCreateTags(List.of(oldTagsCsv.split(","))));
        }
        refreshAiSummary(post);
        return convertToResponse(postRepository.save(post));
    }

    private void snapshotCurrentVersion(Post post) {
        List<String> tagNames = post.getTags().stream()
                .map(Tag::getName).collect(Collectors.toList());
        PostVersion version = postVersionRepository.findByPostId(post.getId())
                .orElseGet(() -> PostVersion.builder().postId(post.getId()).build());
        version.setTitle(post.getTitle());
        version.setContent(post.getContent());
        version.setCoverImageUrl(post.getCoverImageUrl());
        version.setPremium(post.isPremium());
        version.setPrice(post.getPrice());
        version.setTagsCsv(String.join(",", tagNames));
        version.setSavedAt(LocalDateTime.now());
        postVersionRepository.save(version);
    }

    private PostVersionResponse toVersionResponse(PostVersion version) {
        List<String> tags = (version.getTagsCsv() == null || version.getTagsCsv().isBlank())
                ? List.of()
                : List.of(version.getTagsCsv().split(","));
        return PostVersionResponse.builder()
                .id(version.getId())
                .postId(version.getPostId())
                .title(version.getTitle())
                .content(version.getContent())
                .coverImageUrl(version.getCoverImageUrl())
                .isPremium(version.isPremium())
                .price(version.getPrice())
                .tags(tags)
                .savedAt(version.getSavedAt())
                .build();
    }

    private void refreshAiSummary(Post post) {
        String content = post.getContent() == null ? "" : post.getContent();
        int readingTimeMinutes = Math.max(1, (int) Math.ceil((double) countWords(content) / 200.0));
        PostAiSummary summary = postAiSummaryGenerator.generate(post.getTitle(), content, readingTimeMinutes);
        post.setAiSummary(summary);
    }

    private void applyPublishingState(Post post, PostRequest request) {
        LocalDateTime scheduleAt = request.getScheduledPublishAt();
        LocalDateTime now = utcNow();
        if (request.isSaveAsDraft()) {
            post.setStatus(PostStatus.DRAFT);
            post.setScheduledPublishAt(null);
            return;
        }

        if (scheduleAt != null) {
            if (!scheduleAt.isAfter(now)) {
                throw new IllegalArgumentException("Scheduled publish time must be in the future");
            }
            post.setStatus(PostStatus.DRAFT);
            post.setScheduledPublishAt(scheduleAt);
            return;
        }

        post.setStatus(PostStatus.PUBLISHED);
        post.setScheduledPublishAt(null);
    }

    private void publishIfDue(Post post) {
        LocalDateTime now = utcNow();
        if (post.getScheduledPublishAt() != null && !post.getScheduledPublishAt().isAfter(now)) {
            // New behavior: scheduled drafts become published at due time.
            if (post.getStatus() == PostStatus.DRAFT) {
                post.setStatus(PostStatus.PUBLISHED);
                post.setScheduledPublishAt(null);
                postRepository.save(post);
                return;
            }

            // Backward compatibility for older records.
            if (post.getStatus() == PostStatus.PUBLISHED) {
                post.setScheduledPublishAt(null);
                postRepository.save(post);
            }
        }
    }

    private boolean isPubliclyVisible(Post post) {
        LocalDateTime now = utcNow();
        if (post.getStatus() != PostStatus.PUBLISHED) {
            return false;
        }
        return post.getScheduledPublishAt() == null || !post.getScheduledPublishAt().isAfter(now);
    }

    private LocalDateTime utcNow() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }

    private int countWords(String content) {
        if (content == null || content.isBlank()) {
            return 0;
        }
        return content.trim().split("\\s+").length;
    }

    private PostAiSummaryResponse toAiSummaryResponse(PostAiSummary summary, int fallbackReadingTime) {
        if (summary == null) {
            return null;
        }

        // Copy to a plain list so JSON serialization never touches a lazy JPA proxy.
        List<String> keyTakeaways = summary.getKeyTakeaways() == null
            ? List.of()
            : new ArrayList<>(summary.getKeyTakeaways());

        return PostAiSummaryResponse.builder()
                .oneSentenceSummary(summary.getOneSentenceSummary())
            .keyTakeaways(keyTakeaways)
                .estimatedReadingTimeMinutes(
                        summary.getEstimatedReadingTimeMinutes() != null
                                ? summary.getEstimatedReadingTimeMinutes()
                                : fallbackReadingTime)
                .difficultyLevel(summary.getDifficultyLevel())
                .explainSimply(summary.getExplainSimply())
                .generatedAt(summary.getGeneratedAt())
                .generatorVersion(summary.getGeneratorVersion())
                .build();
    }

    /**
     * Find or create Tag entities for the given list of tag name strings.
     * Names are lowercased, trimmed, deduplicated, and capped at 5.
     */
    @SuppressWarnings("null")
    private List<Tag> resolveOrCreateTags(List<String> tagNames) {
        return tagNames.stream()
                .filter(n -> n != null && !n.isBlank())
                .map(n -> n.trim().toLowerCase())
                .distinct()
                .limit(5)
                .map(name -> tagRepository.findByName(name)
                        .orElseGet(() -> Objects.requireNonNull(
                                tagRepository.save(Tag.builder().name(name).build()))))
                .collect(Collectors.toList());
    }
}