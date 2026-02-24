package com.phoenix.repository;

import com.phoenix.entity.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PostRepository extends JpaRepository<Post, UUID> {
    List<Post> findAllByOrderByCreatedAtDesc();
    List<Post> findByTitleContainingIgnoreCaseOrderByCreatedAtDesc(String title);
}
