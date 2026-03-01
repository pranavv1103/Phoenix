package com.phoenix.service;

import com.phoenix.dto.PagedResponse;
import com.phoenix.dto.PostRequest;
import com.phoenix.dto.PostResponse;
import com.phoenix.entity.Post;
import com.phoenix.entity.PostStatus;
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
import com.phoenix.repository.PostViewRepository;
import com.phoenix.entity.PostView;
import com.phoenix.repository.TagRepository;
import com.phoenix.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.lang.NonNull;
import org.springframework.transaction.annotation.Transactional;

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
    private final BookmarkRepository bookmarkRepository;
    private final CommentRepository commentRepository;
    private final PaymentRepository paymentRepository;
    private final PostViewRepository postViewRepository;
    private final TagRepository tagRepository;
    private final FollowRepository followRepository;

    @Transactional(readOnly = true)
    public PagedResponse<PostResponse> getAllPosts(int page, int size, String sort, String tag) {
        Page<Post> postPage;
        if (tag != null && !tag.trim().isEmpty()) {
            String t = tag.trim().toLowerCase();
            if (isMostLiked(sort)) {
                postPage = postRepository.findByTagNameOrderByLikeCountDesc(t, PageRequest.of(page, size));
            } else {
                postPage = postRepository.findByStatusAndTags_Name(PostStatus.PUBLISHED, t, buildPageable(page, size, sort));
            }
        } else if (isMostLiked(sort)) {
            postPage = postRepository.findAllOrderByLikeCountDesc(PageRequest.of(page, size));
        } else {
            postPage = postRepository.findByStatus(PostStatus.PUBLISHED, buildPageable(page, size, sort));
        }
        return buildPagedResponse(postPage);
    }

    @Transactional(readOnly = true)
    public PagedResponse<PostResponse> searchPosts(String query, int page, int size, String sort, String tag) {
        if (query == null || query.trim().isEmpty()) {
            return getAllPosts(page, size, sort, tag);
        }

        Pageable pageable = buildPageable(page, size, sort);
        Page<Post> postPage;

        if (tag != null && !tag.trim().isEmpty()) {
            String t = tag.trim().toLowerCase();
            if (isMostLiked(sort)) {
                postPage = postRepository.findByTitleContainingIgnoreCaseAndTagNameOrderByLikeCountDesc(
                        query.trim(), t, PageRequest.of(page, size));
            } else {
                postPage = postRepository.findByStatusAndTitleContainingIgnoreCaseAndTags_Name(
                        PostStatus.PUBLISHED, query.trim(), t, pageable);
            }
        } else if (isMostLiked(sort)) {
            postPage = postRepository.findByTitleContainingIgnoreCaseOrderByLikeCountDesc(query.trim(), PageRequest.of(page, size));
        } else {
            postPage = postRepository.findByStatusAndTitleContainingIgnoreCase(PostStatus.PUBLISHED, query.trim(), pageable);
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

        // Count only unique views per authenticated user
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            User viewer = userRepository.findByEmail(auth.getName()).orElse(null);
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

        Post post = Post.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .isPremium(request.isPremium())
                .price(request.getPrice())
                .author(author)
                .status(request.isSaveAsDraft() ? PostStatus.DRAFT : PostStatus.PUBLISHED)
                .build();

        if (request.getTags() != null && !request.getTags().isEmpty()) {
            post.setTags(resolveOrCreateTags(request.getTags()));
        }

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

        post.setTitle(request.getTitle());
        post.setContent(request.getContent());
        post.setPremium(request.isPremium());
        post.setPrice(request.getPrice());
        post.setStatus(request.isSaveAsDraft() ? PostStatus.DRAFT : PostStatus.PUBLISHED);

        post.getTags().clear();
        if (request.getTags() != null && !request.getTags().isEmpty()) {
            post.getTags().addAll(resolveOrCreateTags(request.getTags()));
        }

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
        postRepository.delete(post);
    }

    @Transactional(readOnly = true)
    public List<PostResponse> getMyDrafts(String userEmail) {
        return postRepository.findByAuthorEmailAndStatus(userEmail, PostStatus.DRAFT)
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PagedResponse<PostResponse> getTrendingPosts(int page, int size) {
        Page<Post> postPage = postRepository.findAllOrderByLikeCountDesc(PageRequest.of(page, size));
        return buildPagedResponse(postPage);
    }

    @Transactional(readOnly = true)
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
        Page<Post> postPage = postRepository.findByAuthorIdIn(followingIds, PageRequest.of(page, size));
        return buildPagedResponse(postPage);
    }

    @Transactional(readOnly = true)
    public List<PostResponse> getRelatedPosts(@NonNull UUID id) {
        Post post = postRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new PostNotFoundException("Post not found with id: " + id));
        List<String> tagNames = post.getTags().stream()
                .map(com.phoenix.entity.Tag::getName)
                .collect(Collectors.toList());

        // Try tag-based related posts first (up to 4)
        List<Post> related = tagNames.isEmpty()
                ? List.of()
                : postRepository.findRelatedPosts(tagNames, id, PageRequest.of(0, 4));

        // Fallback: show recent published posts if no tag matches found
        if (related.isEmpty()) {
            related = postRepository.findRecentPostsExcluding(id, PageRequest.of(0, 3));
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

        if (currentUser != null) {
            final UUID userId = currentUser.getId();
            likedByCurrentUser = likeRepository.existsByPostIdAndUserId(post.getId(), userId);
            isAuthor = post.getAuthor().getId().equals(userId);
            if (post.isPremium() && !isAuthor) {
                paidByCurrentUser = paymentRepository
                        .existsByPost_IdAndUser_IdAndStatus(post.getId(), userId, "COMPLETED");
            }
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

        List<String> tagNames = (post.getTags() != null)
                ? post.getTags().stream().map(Tag::getName).collect(Collectors.toList())
                : new ArrayList<>();

        return PostResponse.builder()
                .id(post.getId())
                .title(post.getTitle())
                .content(content)
                .authorName(post.getAuthor().getName())
                .authorEmail(post.getAuthor().getEmail())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .commentCount(post.getComments() != null ? post.getComments().size() : 0)
                .likeCount(likeCount)
                .likedByCurrentUser(likedByCurrentUser)
                .isPremium(post.isPremium())
                .price(post.getPrice())
                .paidByCurrentUser(paidByCurrentUser)
                .author(isAuthor)
                .viewCount(post.getViewCount())
                .readingTimeMinutes(readingTimeMinutes)
                .tags(tagNames)
                .status(post.getStatus() != null ? post.getStatus().name() : "PUBLISHED")
                .bookmarkedByCurrentUser(bookmarkedByCurrentUser)
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