package com.phoenix.repository;

import com.phoenix.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface PostRepository extends JpaRepository<Post, UUID> {
    Page<Post> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<Post> findByTitleContainingIgnoreCaseOrderByCreatedAtDesc(String title, Pageable pageable);
    Page<Post> findByTitleContainingIgnoreCase(String title, Pageable pageable);

    @Query(
        value = "select p from Post p left join Like l on l.post = p group by p " +
            "order by count(l) desc, p.createdAt desc",
        countQuery = "select count(p) from Post p"
    )
    Page<Post> findAllOrderByLikeCountDesc(Pageable pageable);

    @Query(
        value = "select p from Post p left join Like l on l.post = p " +
            "where lower(p.title) like lower(concat('%', :title, '%')) " +
            "group by p order by count(l) desc, p.createdAt desc",
        countQuery = "select count(p) from Post p " +
            "where lower(p.title) like lower(concat('%', :title, '%'))"
    )
    Page<Post> findByTitleContainingIgnoreCaseOrderByLikeCountDesc(
        @Param("title") String title,
        Pageable pageable
    );
}
