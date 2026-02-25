package com.phoenix.repository;

import com.phoenix.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);

    @Query("SELECT u FROM User u WHERE TRIM(u.name) = TRIM(:name)")
    Optional<User> findByName(@Param("name") String name);

    boolean existsByEmail(String email);
}
