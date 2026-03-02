package com.phoenix.repository;

import com.phoenix.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    Page<Notification> findByRecipient_EmailOrderByCreatedAtDesc(String email, Pageable pageable);

    long countByRecipient_EmailAndIsReadFalse(String email);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.id = :id AND n.recipient.email = :email")
    void markAsRead(@Param("id") UUID id, @Param("email") String email);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.recipient.email = :email AND n.isRead = false")
    void markAllAsRead(@Param("email") String email);
}
