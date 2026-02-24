package com.phoenix.controller;

import com.phoenix.dto.ApiResponse;
import com.phoenix.dto.PaymentOrderRequest;
import com.phoenix.dto.PaymentOrderResponse;
import com.phoenix.dto.PaymentVerifyRequest;
import com.phoenix.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    /**
     * POST /api/payments/create-order
     * Creates a Razorpay order for the given premium post.
     * Requires authentication.
     */
    @PostMapping("/create-order")
    public ResponseEntity<PaymentOrderResponse> createOrder(
            @RequestBody @Valid PaymentOrderRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        PaymentOrderResponse response = paymentService.createOrder(request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/payments/verify
     * Verifies the Razorpay payment signature and marks payment as completed.
     * Requires authentication.
     */
    @PostMapping("/verify")
    public ResponseEntity<ApiResponse> verifyPayment(
            @RequestBody @Valid PaymentVerifyRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        paymentService.verifyPayment(request, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Payment verified successfully", null));
    }

    /**
     * GET /api/payments/check/{postId}
     * Returns whether the current user has paid for the given post.
     * Requires authentication.
     */
    @GetMapping("/check/{postId}")
    public ResponseEntity<ApiResponse<Boolean>> checkPayment(
            @PathVariable UUID postId,
            @AuthenticationPrincipal UserDetails userDetails) {

        boolean paid = paymentService.hasPaid(postId, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(paid ? "Paid" : "Not paid", paid));
    }
}
