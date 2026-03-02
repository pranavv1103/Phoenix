package com.phoenix.repository;

import com.phoenix.entity.Series;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SeriesRepository extends JpaRepository<Series, UUID> {

    List<Series> findByAuthor_EmailOrderByCreatedAtDesc(String email);

    Optional<Series> findByAuthor_EmailAndName(String email, String name);
}
