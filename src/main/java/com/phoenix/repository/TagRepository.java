package com.phoenix.repository;

import com.phoenix.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TagRepository extends JpaRepository<Tag, UUID> {

    Optional<Tag> findByName(String name);

    // All tags that are actually used in at least one post, sorted by usage count desc then name asc
    @Query("select t.name from Tag t inner join t.posts p group by t.name order by count(p) desc, t.name asc")
    List<String> findAllUsedTagNamesSortedByUsage();
}
