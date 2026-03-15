package com.phoenix.repository;

import com.phoenix.entity.PostVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PostVersionRepository extends JpaRepository<PostVersion, UUID> {
    Optional<PostVersion> findByPostId(UUID postId);
    void deleteByPostId(UUID postId);
}
