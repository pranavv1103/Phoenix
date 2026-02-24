package com.phoenix.service;

import com.phoenix.dto.PaymentOrderRequest;
import com.phoenix.dto.PaymentOrderResponse;
import com.phoenix.dto.PaymentVerifyRequest;
import com.phoenix.entity.Payment;
import com.phoenix.entity.Post;
import com.phoenix.entity.User;
import com.phoenix.exception.PostNotFoundException;
import com.phoenix.exception.UnauthorizedException;
import com.phoenix.repository.PaymentRepository;
import com.phoenix.repository.PostRepository;
import com.phoenix.repository.UserRepository;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    /**
     * Create a Razorpay order for a premium post.
     */
    @Transactional
    public PaymentOrderResponse createOrder(PaymentOrderRequest request, String userEmail) {
        Post post = postRepository.findById(request.getPostId())
                .orElseThrow(() -> new PostNotFoundException("Post not found"));

        if (!post.isPremium()) {
            throw new UnauthorizedException("Post is not a premium post");
        }

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Author gets free access — no order needed
        if (post.getAuthor().getId().equals(user.getId())) {
            throw new UnauthorizedException("You are the author of this post");
        }

        // Already paid
        if (paymentRepository.existsByPost_IdAndUser_IdAndStatus(post.getId(), user.getId(), "COMPLETED")) {
            throw new UnauthorizedException("You have already paid for this post");
        }

        try {
            RazorpayClient client = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", post.getPrice());   // already in paise
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", "rcpt_" + post.getId().toString().substring(0, 8));

            Order rzpOrder = client.orders.create(orderRequest);
            String orderId = rzpOrder.get("id");

            // Persist PENDING payment record
            Payment payment = Payment.builder()
                    .user(user)
                    .post(post)
                    .razorpayOrderId(orderId)
                    .amount(post.getPrice())
                    .status("PENDING")
                    .build();
            paymentRepository.save(payment);

            return PaymentOrderResponse.builder()
                    .orderId(orderId)
                    .amount(post.getPrice())
                    .currency("INR")
                    .keyId(razorpayKeyId)
                    .build();

        } catch (RazorpayException e) {
            log.error("Razorpay order creation failed", e);
            throw new RuntimeException("Payment gateway error: " + e.getMessage());
        }
    }

    /**
     * Verify Razorpay payment signature and mark payment COMPLETED.
     */
    @Transactional
    public void verifyPayment(PaymentVerifyRequest request, String userEmail) {
        Payment payment = paymentRepository.findByRazorpayOrderId(request.getRazorpayOrderId())
                .orElseThrow(() -> new RuntimeException("Payment record not found"));

        if (!payment.getUser().getEmail().equals(userEmail)) {
            throw new UnauthorizedException("Payment does not belong to current user");
        }

        String payload = request.getRazorpayOrderId() + "|" + request.getRazorpayPaymentId();
        String generatedSignature = hmacSha256(payload, razorpayKeySecret);

        if (!generatedSignature.equals(request.getRazorpaySignature())) {
            payment.setStatus("FAILED");
            paymentRepository.save(payment);
            throw new UnauthorizedException("Payment signature verification failed");
        }

        payment.setStatus("COMPLETED");
        payment.setRazorpayPaymentId(request.getRazorpayPaymentId());
        paymentRepository.save(payment);
    }

    /**
     * Check whether the current user has completed payment for a given post.
     */
    public boolean hasPaid(UUID postId, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElse(null);
        if (user == null) return false;
        return paymentRepository.existsByPost_IdAndUser_IdAndStatus(postId, user.getId(), "COMPLETED");
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private String hmacSha256(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec = new SecretKeySpec(secret.getBytes(), "HmacSHA256");
            mac.init(keySpec);
            byte[] hash = mac.doFinal(data.getBytes());
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new RuntimeException("HMAC-SHA256 error", e);
        }
    }
}
