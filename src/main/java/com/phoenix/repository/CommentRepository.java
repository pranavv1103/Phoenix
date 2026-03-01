package com.phoenix.repository;

import com.phoenix.entity.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Repository
public interface CommentRepository extends JpaRepository<Comment, UUID> {
    Page<Comment> findByPostIdOrderByCreatedAtAsc(UUID postId, Pageable pageable);
    Page<Comment> findByPostIdAndParentIsNullOrderByCreatedAtAsc(UUID postId, Pageable pageable);
    List<Comment> findByParentIdOrderByCreatedAtAsc(UUID parentId);
    long countByPostId(UUID postId);

    @Modifying
    @Transactional
    @Query("delete from Comment c where c.post.id = :postId and c.parent is not null")
    void deleteRepliesByPostId(@Param("postId") UUID postId);

    void deleteByPostId(UUID postId);
}
