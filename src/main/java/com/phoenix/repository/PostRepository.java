package com.phoenix.repository;

import com.phoenix.entity.Post;
import com.phoenix.entity.ReactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;
import java.time.LocalDateTime;

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

    @Query("select p from Post p where p.author.email = :authorEmail and p.status = 'DRAFT' and (p.scheduledPublishAt is null or p.scheduledPublishAt > :now) order by p.updatedAt desc")
    List<Post> findDraftAndScheduledByAuthorEmail(@Param("authorEmail") String authorEmail, @Param("now") LocalDateTime now);

    List<Post> findByStatusAndScheduledPublishAtLessThanEqual(com.phoenix.entity.PostStatus status, LocalDateTime dateTime);

    @Query(
        value = "select p from Post p where p.status = 'PUBLISHED' and (p.scheduledPublishAt is null or p.scheduledPublishAt <= :now)",
        countQuery = "select count(p) from Post p where p.status = 'PUBLISHED' and (p.scheduledPublishAt is null or p.scheduledPublishAt <= :now)"
    )
    Page<Post> findVisible(@Param("now") LocalDateTime now, Pageable pageable);

    @Query(
        value = "select p from Post p where p.status = 'PUBLISHED' and (p.scheduledPublishAt is null or p.scheduledPublishAt <= :now) and lower(p.title) like lower(concat('%', :title, '%'))",
        countQuery = "select count(p) from Post p where p.status = 'PUBLISHED' and (p.scheduledPublishAt is null or p.scheduledPublishAt <= :now) and lower(p.title) like lower(concat('%', :title, '%'))"
    )
    Page<Post> findVisibleByTitle(@Param("title") String title, @Param("now") LocalDateTime now, Pageable pageable);

    @Query(
        value = "select p from Post p join p.tags t where p.status = 'PUBLISHED' and (p.scheduledPublishAt is null or p.scheduledPublishAt <= :now) and t.name = :tag",
        countQuery = "select count(p) from Post p join p.tags t where p.status = 'PUBLISHED' and (p.scheduledPublishAt is null or p.scheduledPublishAt <= :now) and t.name = :tag"
    )
    Page<Post> findVisibleByTag(@Param("tag") String tag, @Param("now") LocalDateTime now, Pageable pageable);

    @Query(
        value = "select p from Post p join p.tags t where p.status = 'PUBLISHED' and (p.scheduledPublishAt is null or p.scheduledPublishAt <= :now) and lower(p.title) like lower(concat('%', :title, '%')) and t.name = :tag",
        countQuery = "select count(p) from Post p join p.tags t where p.status = 'PUBLISHED' and (p.scheduledPublishAt is null or p.scheduledPublishAt <= :now) and lower(p.title) like lower(concat('%', :title, '%')) and t.name = :tag"
    )
    Page<Post> findVisibleByTitleAndTag(@Param("title") String title, @Param("tag") String tag, @Param("now") LocalDateTime now, Pageable pageable);

    @Query(
        value = "select p from Post p left join Reaction r on r.post = p and r.type = :likeType where p.status = 'PUBLISHED' and (p.scheduledPublishAt is null or p.scheduledPublishAt <= :now) group by p order by count(r) desc, p.createdAt desc",
        countQuery = "select count(p) from Post p where p.status = 'PUBLISHED' and (p.scheduledPublishAt is null or p.scheduledPublishAt <= :now)"
    )
    Page<Post> findAllOrderByLikeCountDesc(@Param("now") LocalDateTime now, @Param("likeType") ReactionType likeType, Pageable pageable);

    @Query(
        value = "select p from Post p left join Reaction r on r.post = p and r.type = :likeType " +
            "where p.status = 'PUBLISHED' and (p.scheduledPublishAt is null or p.scheduledPublishAt <= :now) and lower(p.title) like lower(concat('%', :title, '%')) " +
            "group by p order by count(r) desc, p.createdAt desc",
        countQuery = "select count(p) from Post p " +
            "where p.status = 'PUBLISHED' and (p.scheduledPublishAt is null or p.scheduledPublishAt <= :now) and lower(p.title) like lower(concat('%', :title, '%'))"
    )
    Page<Post> findByTitleContainingIgnoreCaseOrderByLikeCountDesc(
        @Param("title") String title,
        @Param("now") LocalDateTime now,
        @Param("likeType") ReactionType likeType,
        Pageable pageable
    );

    @Query(
        value = "select p from Post p left join Reaction r on r.post = p and r.type = :likeType join p.tags t " +
            "where p.status = 'PUBLISHED' and (p.scheduledPublishAt is null or p.scheduledPublishAt <= :now) and t.name = :tag group by p order by count(r) desc, p.createdAt desc",
        countQuery = "select count(p) from Post p join p.tags t where p.status = 'PUBLISHED' and (p.scheduledPublishAt is null or p.scheduledPublishAt <= :now) and t.name = :tag"
    )
    Page<Post> findByTagNameOrderByLikeCountDesc(
        @Param("tag") String tag,
        @Param("now") LocalDateTime now,
        @Param("likeType") ReactionType likeType,
        Pageable pageable
    );

    @Query(
        value = "select p from Post p left join Reaction r on r.post = p and r.type = :likeType join p.tags t " +
            "where p.status = 'PUBLISHED' and (p.scheduledPublishAt is null or p.scheduledPublishAt <= :now) and lower(p.title) like lower(concat('%', :title, '%')) and t.name = :tag " +
            "group by p order by count(r) desc, p.createdAt desc",
        countQuery = "select count(p) from Post p join p.tags t " +
            "where p.status = 'PUBLISHED' and (p.scheduledPublishAt is null or p.scheduledPublishAt <= :now) and lower(p.title) like lower(concat('%', :title, '%')) and t.name = :tag"
    )
    Page<Post> findByTitleContainingIgnoreCaseAndTagNameOrderByLikeCountDesc(
        @Param("title") String title,
        @Param("tag") String tag,
        @Param("now") LocalDateTime now,
        @Param("likeType") ReactionType likeType,
        Pageable pageable
    );

    @Query(
        "select p from Post p join p.tags t where p.status = 'PUBLISHED' and (p.scheduledPublishAt is null or p.scheduledPublishAt <= :now) and t.name in :tagNames and p.id != :excludeId " +
        "group by p order by count(t) desc, p.createdAt desc"
    )
    List<Post> findRelatedPosts(
        @Param("tagNames") List<String> tagNames,
        @Param("excludeId") UUID excludeId,
        @Param("now") LocalDateTime now,
        Pageable pageable
    );

    @Query("select p from Post p where p.status = 'PUBLISHED' and (p.scheduledPublishAt is null or p.scheduledPublishAt <= :now) and p.id != :excludeId order by p.createdAt desc")
    List<Post> findRecentPostsExcluding(@Param("excludeId") UUID excludeId, @Param("now") LocalDateTime now, Pageable pageable);

    @Query(
        value = "select p from Post p where p.status = 'PUBLISHED' and (p.scheduledPublishAt is null or p.scheduledPublishAt <= :now) and p.author.id in :authorIds order by p.createdAt desc",
        countQuery = "select count(p) from Post p where p.status = 'PUBLISHED' and (p.scheduledPublishAt is null or p.scheduledPublishAt <= :now) and p.author.id in :authorIds"
    )
    Page<Post> findByAuthorIdIn(@Param("authorIds") List<UUID> authorIds, @Param("now") LocalDateTime now, Pageable pageable);

    @Query(
        value = "select p from Post p left join Like l on l.post = p " +
            "where p.status = 'PUBLISHED' and (p.scheduledPublishAt is null or p.scheduledPublishAt <= :now) and p.createdAt >= :since " +
            "group by p order by count(l) desc, p.viewCount desc, p.createdAt desc",
        countQuery = "select count(p) from Post p where p.status = 'PUBLISHED' and (p.scheduledPublishAt is null or p.scheduledPublishAt <= :now) and p.createdAt >= :since"
    )
    List<Post> findTopPostsSince(@Param("since") java.time.LocalDateTime since, @Param("now") java.time.LocalDateTime now, Pageable pageable);

    // Series helpers
    List<Post> findBySeries_IdOrderBySeriesOrder(UUID seriesId);

    long countBySeries_Id(UUID seriesId);
}
