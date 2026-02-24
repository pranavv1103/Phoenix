package com.phoenix.service;

import com.phoenix.dto.PostRequest;
import com.phoenix.dto.PostResponse;
import com.phoenix.entity.Post;
import com.phoenix.entity.User;
import com.phoenix.exception.PostNotFoundException;
import com.phoenix.exception.UnauthorizedException;
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
public class PostService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<PostResponse> getAllPosts() {
        return postRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PostResponse> searchPosts(String query) {
        if (query == null || query.trim().isEmpty()) {
            return getAllPosts();
        }
        return postRepository.findByTitleContainingIgnoreCaseOrderByCreatedAtDesc(query.trim()).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
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

        if (!post.getAuthor().getEmail().equals(userEmail)) {
            throw new UnauthorizedException("You are not authorized to delete this post");
        }

        postRepository.delete(post);
    }

    private PostResponse convertToResponse(Post post) {
        return PostResponse.builder()
                .id(post.getId())
                .title(post.getTitle())
                .content(post.getContent())
                .authorName(post.getAuthor().getName())
                .authorEmail(post.getAuthor().getEmail())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .commentCount(post.getComments() != null ? post.getComments().size() : 0)
                .build();
    }
}
