package com.phoenix.controller;

import com.phoenix.dto.AiChatRequest;
import com.phoenix.dto.AiChatResponse;
import com.phoenix.dto.ApiResponse;
import com.phoenix.service.AiService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<AiChatResponse>> chat(@Valid @RequestBody AiChatRequest request) {
        AiChatResponse response = aiService.chat(request);
        return ResponseEntity.ok(ApiResponse.success("AI response generated", response));
    }
}
