package com.phoenix.service;

import com.phoenix.dto.PostResponse;
import com.phoenix.entity.Bookmark;
import com.phoenix.entity.Post;
import com.phoenix.entity.User;
import com.phoenix.exception.PostNotFoundException;
import com.phoenix.repository.BookmarkRepository;
import com.phoenix.repository.PostRepository;
import com.phoenix.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BookmarkService {

    private final BookmarkRepository bookmarkRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final PostService postService;

    /**
     * Toggle bookmark on a post for the given user.
     * Returns true if the post was bookmarked, false if the bookmark was removed.
     */
    @Transactional
    @SuppressWarnings("null")
    public boolean toggleBookmark(UUID postId, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new PostNotFoundException("User not found"));
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new PostNotFoundException("Post not found"));

        if (bookmarkRepository.existsByUserIdAndPostId(user.getId(), postId)) {
            bookmarkRepository.deleteByUserIdAndPostId(user.getId(), postId);
            return false;
        } else {
            bookmarkRepository.save(Bookmark.builder().user(user).post(post).build());
            return true;
        }
    }

    /**
     * Returns all bookmarked posts for the given user, newest first.
     */
    @Transactional(readOnly = true)
    public List<PostResponse> getMyBookmarks(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new PostNotFoundException("User not found"));
        return bookmarkRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(b -> postService.convertToResponse(b.getPost()))
                .toList();
    }
}
