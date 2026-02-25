package com.phoenix.service;

import com.phoenix.dto.CommentRequest;
import com.phoenix.dto.CommentResponse;
import com.phoenix.dto.PagedResponse;
import com.phoenix.entity.Comment;
import com.phoenix.entity.Post;
import com.phoenix.entity.User;
import com.phoenix.exception.PostNotFoundException;
import com.phoenix.exception.UnauthorizedException;
import com.phoenix.repository.CommentRepository;
import com.phoenix.repository.PostRepository;
import com.phoenix.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public PagedResponse<CommentResponse> getCommentsByPostId(@NonNull UUID postId, int page, int size) {
        if (!postRepository.existsById(Objects.requireNonNull(postId))) {
            throw new PostNotFoundException("Post not found with id: " + postId);
        }

        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").ascending());
        Page<Comment> commentPage = commentRepository.findByPostIdOrderByCreatedAtAsc(postId, pageable);

        List<CommentResponse> content = commentPage.getContent().stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());

        return PagedResponse.<CommentResponse>builder()
                .content(content)
                .pageNumber(commentPage.getNumber())
                .pageSize(commentPage.getSize())
                .totalElements(commentPage.getTotalElements())
                .totalPages(commentPage.getTotalPages())
                .first(commentPage.isFirst())
                .last(commentPage.isLast())
                .build();
    }

    @Transactional
    public CommentResponse createComment(@NonNull UUID postId, CommentRequest request, String userEmail) {
        Post post = postRepository.findById(Objects.requireNonNull(postId))
                .orElseThrow(() -> new PostNotFoundException("Post not found with id: " + postId));

        User author = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        Comment comment = Comment.builder()
                .content(request.getContent())
                .post(post)
                .author(author)
                .build();

        Comment savedComment = commentRepository.save(Objects.requireNonNull(comment));
        return convertToResponse(savedComment);
    }

    @Transactional
    public CommentResponse updateComment(@NonNull UUID commentId, CommentRequest request, String userEmail) {
        Comment comment = commentRepository.findById(Objects.requireNonNull(commentId))
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (!comment.getAuthor().getEmail().equals(userEmail)) {
            throw new UnauthorizedException("You are not authorized to edit this comment");
        }

        comment.setContent(request.getContent());
        Comment updated = commentRepository.save(comment);
        return convertToResponse(updated);
    }

    @Transactional
    public void deleteComment(@NonNull UUID commentId, String userEmail) {
        Comment comment = commentRepository.findById(Objects.requireNonNull(commentId))
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (!comment.getAuthor().getEmail().equals(userEmail)) {
            throw new UnauthorizedException("You are not authorized to delete this comment");
        }

        commentRepository.delete(comment);
    }

    private CommentResponse convertToResponse(Comment comment) {
        return CommentResponse.builder()
                .id(comment.getId())
                .content(comment.getContent())
                .authorName(comment.getAuthor().getName())
                .authorEmail(comment.getAuthor().getEmail())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .build();
    }
}
