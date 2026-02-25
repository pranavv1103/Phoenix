package com.phoenix.repository;

import com.phoenix.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PostRepository extends JpaRepository<Post, UUID> {
    Page<Post> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<Post> findByTitleContainingIgnoreCaseOrderByCreatedAtDesc(String title, Pageable pageable);
    Page<Post> findByTitleContainingIgnoreCase(String title, Pageable pageable);

    // Tag filter (Spring Data ManyToMany traversal)
    Page<Post> findByTags_Name(String tagName, Pageable pageable);
    Page<Post> findByTitleContainingIgnoreCaseAndTags_Name(String title, String tagName, Pageable pageable);
    Page<Post> findByStatusAndTags_Name(com.phoenix.entity.PostStatus status, String tagName, Pageable pageable);
    Page<Post> findByStatusAndTitleContainingIgnoreCaseAndTags_Name(com.phoenix.entity.PostStatus status, String title, String tagName, Pageable pageable);
    Page<Post> findByStatus(com.phoenix.entity.PostStatus status, Pageable pageable);
    Page<Post> findByStatusAndTitleContainingIgnoreCase(com.phoenix.entity.PostStatus status, String title, Pageable pageable);
    List<Post> findByAuthorEmailAndStatus(String authorEmail, com.phoenix.entity.PostStatus status);

    @Query(
        value = "select p from Post p left join Like l on l.post = p where p.status = 'PUBLISHED' group by p order by count(l) desc, p.createdAt desc",
        countQuery = "select count(p) from Post p where p.status = 'PUBLISHED'"
    )
    Page<Post> findAllOrderByLikeCountDesc(Pageable pageable);

    @Query(
        value = "select p from Post p left join Like l on l.post = p " +
            "where p.status = 'PUBLISHED' and lower(p.title) like lower(concat('%', :title, '%')) " +
            "group by p order by count(l) desc, p.createdAt desc",
        countQuery = "select count(p) from Post p " +
            "where p.status = 'PUBLISHED' and lower(p.title) like lower(concat('%', :title, '%'))"
    )
    Page<Post> findByTitleContainingIgnoreCaseOrderByLikeCountDesc(
        @Param("title") String title,
        Pageable pageable
    );

    @Query(
        value = "select p from Post p left join Like l on l.post = p join p.tags t " +
            "where p.status = 'PUBLISHED' and t.name = :tag group by p order by count(l) desc, p.createdAt desc",
        countQuery = "select count(p) from Post p join p.tags t where p.status = 'PUBLISHED' and t.name = :tag"
    )
    Page<Post> findByTagNameOrderByLikeCountDesc(
        @Param("tag") String tag,
        Pageable pageable
    );

    @Query(
        value = "select p from Post p left join Like l on l.post = p join p.tags t " +
            "where p.status = 'PUBLISHED' and lower(p.title) like lower(concat('%', :title, '%')) and t.name = :tag " +
            "group by p order by count(l) desc, p.createdAt desc",
        countQuery = "select count(p) from Post p join p.tags t " +
            "where p.status = 'PUBLISHED' and lower(p.title) like lower(concat('%', :title, '%')) and t.name = :tag"
    )
    Page<Post> findByTitleContainingIgnoreCaseAndTagNameOrderByLikeCountDesc(
        @Param("title") String title,
        @Param("tag") String tag,
        Pageable pageable
    );

    @Query(
        "select p from Post p join p.tags t where t.name in :tagNames and p.id != :excludeId " +
        "group by p order by count(t) desc, p.createdAt desc"
    )
    List<Post> findRelatedPosts(
        @Param("tagNames") List<String> tagNames,
        @Param("excludeId") UUID excludeId,
        Pageable pageable
    );
}
