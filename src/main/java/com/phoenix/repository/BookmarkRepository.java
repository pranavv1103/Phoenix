package com.phoenix.repository;

import com.phoenix.entity.Bookmark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

public interface BookmarkRepository extends JpaRepository<Bookmark, UUID> {

    boolean existsByUserIdAndPostId(UUID userId, UUID postId);

    @Transactional
    void deleteByUserIdAndPostId(UUID userId, UUID postId);

    @Transactional
    void deleteByPostId(UUID postId);

    List<Bookmark> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
