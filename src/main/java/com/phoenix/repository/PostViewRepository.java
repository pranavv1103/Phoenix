package com.phoenix.repository;

import com.phoenix.entity.PostView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface PostViewRepository extends JpaRepository<PostView, UUID> {
    boolean existsByPostIdAndUserId(UUID postId, UUID userId);
}
