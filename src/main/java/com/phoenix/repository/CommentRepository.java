package com.phoenix.repository;

import com.phoenix.entity.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface CommentRepository extends JpaRepository<Comment, UUID> {
    Page<Comment> findByPostIdOrderByCreatedAtAsc(UUID postId, Pageable pageable);
    long countByPostId(UUID postId);
    void deleteByPostId(UUID postId);
}
