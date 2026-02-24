package com.phoenix.service;

import com.phoenix.dto.CommentRequest;
import com.phoenix.dto.CommentResponse;
import com.phoenix.entity.Comment;
import com.phoenix.entity.Post;
import com.phoenix.entity.User;
import com.phoenix.exception.PostNotFoundException;
import com.phoenix.repository.CommentRepository;
import com.phoenix.repository.PostRepository;
import com.phoenix.repository.UserRepository;
import lombok.RequiredArgsConstructor;
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
    public List<CommentResponse> getCommentsByPostId(@NonNull UUID postId) {
        if (!postRepository.existsById(Objects.requireNonNull(postId))) {
            throw new PostNotFoundException("Post not found with id: " + postId);
        }

        return commentRepository.findByPostIdOrderByCreatedAtAsc(postId).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
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
