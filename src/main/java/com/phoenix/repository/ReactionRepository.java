package com.phoenix.repository;

import com.phoenix.entity.Reaction;
import com.phoenix.entity.ReactionType;
import com.phoenix.entity.Post;
import com.phoenix.entity.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReactionRepository extends JpaRepository<Reaction, UUID> {
    long countByPost(Post post);
    boolean existsByPostAndUser(Post post, User user);
    
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Reaction> findByPostAndUser(Post post, User user);
    
    long countByPostId(UUID postId);
    boolean existsByPostIdAndUserId(UUID postId, UUID userId);
    void deleteByPostId(UUID postId);
    
    // Delete all reactions for a specific user and post (cleanup for duplicates)
    @Modifying
    @Query("DELETE FROM Reaction r WHERE r.post.id = :postId AND r.user.id = :userId")
    void deleteAllByPostIdAndUserId(@Param("postId") UUID postId, @Param("userId") UUID userId);
    
    // New methods for reaction types
    long countByPostIdAndType(UUID postId, ReactionType type);
    
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Reaction> findByPostIdAndUserId(UUID postId, UUID userId);
    
    @Query("SELECT r.type, COUNT(r) FROM Reaction r WHERE r.post.id = :postId GROUP BY r.type")
    List<Object[]> countReactionsByType(@Param("postId") UUID postId);
}
