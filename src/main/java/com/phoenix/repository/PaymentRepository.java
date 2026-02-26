package com.phoenix.repository;

import com.phoenix.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    boolean existsByPost_IdAndUser_IdAndStatus(UUID postId, UUID userId, String status);

    Optional<Payment> findByRazorpayOrderId(String razorpayOrderId);

    @org.springframework.transaction.annotation.Transactional
    void deleteByPostId(UUID postId);
}
