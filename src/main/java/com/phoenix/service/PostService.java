package com.phoenix.service;

import com.phoenix.dto.PagedResponse;
import com.phoenix.dto.PostRequest;
import com.phoenix.dto.PostResponse;
import com.phoenix.entity.Post;
import com.phoenix.entity.User;
import com.phoenix.entity.UserRole;
import com.phoenix.exception.PostNotFoundException;
import com.phoenix.exception.UnauthorizedException;
import com.phoenix.repository.CommentRepository;
import com.phoenix.repository.LikeRepository;
import com.phoenix.repository.PostRepository;
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
    private final CommentRepository commentRepository;

    @Transactional(readOnly = true)
    public PagedResponse<PostResponse> getAllPosts(int page, int size, String sort) {
        Page<Post> postPage;
        if (isMostLiked(sort)) {
            postPage = postRepository.findAllOrderByLikeCountDesc(PageRequest.of(page, size));
        } else {
            postPage = postRepository.findAll(buildPageable(page, size, sort));
        }
        return buildPagedResponse(postPage);
    }

    @Transactional(readOnly = true)
    public PagedResponse<PostResponse> searchPosts(String query, int page, int size, String sort) {
        if (query == null || query.trim().isEmpty()) {
            return getAllPosts(page, size, sort);
        }

        Pageable pageable = buildPageable(page, size, sort);
        Page<Post> postPage;
        
        if (isMostLiked(sort)) {
            postPage = postRepository.findByTitleContainingIgnoreCaseOrderByLikeCountDesc(query.trim(), PageRequest.of(page, size));
        } else {
            postPage = postRepository.findByTitleContainingIgnoreCase(query.trim(), pageable);
        }
        
        return buildPagedResponse(postPage);
    }

    private Pageable buildPageable(int page, int size, String sort) {
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

    @Transactional(readOnly = true)
    public PostResponse getPostById(@NonNull UUID id) {
        Post post = postRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new PostNotFoundException("Post not found with id: " + id));
        return convertToResponse(post);
    }

    @Transactional
    public PostResponse createPost(PostRequest request, String userEmail) {
        User author = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        Post post = Post.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .author(author)
                .build();

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

        likeRepository.deleteByPostId(id);
        commentRepository.deleteByPostId(id);
        postRepository.delete(post);
    }

    private PostResponse convertToResponse(Post post) {
        long likeCount = likeRepository.countByPostId(post.getId());
        boolean likedByCurrentUser = false;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            userRepository.findByEmail(auth.getName()).ifPresent(user ->
                likeRepository.existsByPostIdAndUserId(post.getId(), user.getId()));
            // re-check with the actual user
            likedByCurrentUser = userRepository.findByEmail(auth.getName())
                    .map(user -> likeRepository.existsByPostIdAndUserId(post.getId(), user.getId()))
                    .orElse(false);
        }
        return PostResponse.builder()
                .id(post.getId())
                .title(post.getTitle())
                .content(post.getContent())
                .authorName(post.getAuthor().getName())
                .authorEmail(post.getAuthor().getEmail())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .commentCount(post.getComments() != null ? post.getComments().size() : 0)
                .likeCount(likeCount)
                .likedByCurrentUser(likedByCurrentUser)
                .build();
    }
}
