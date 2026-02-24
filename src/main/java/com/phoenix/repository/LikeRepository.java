package com.phoenix.repository;

import com.phoenix.entity.Like;
import com.phoenix.entity.Post;
import com.phoenix.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface LikeRepository extends JpaRepository<Like, UUID> {
    long countByPost(Post post);
    boolean existsByPostAndUser(Post post, User user);
    Optional<Like> findByPostAndUser(Post post, User user);
    long countByPostId(UUID postId);
    boolean existsByPostIdAndUserId(UUID postId, UUID userId);
}
