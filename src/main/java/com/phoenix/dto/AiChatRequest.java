package com.phoenix.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatRequest {

    @NotBlank(message = "Message cannot be blank")
    @Size(max = 4000, message = "Message must not exceed 4000 characters")
    private String message;

    private List<MessageDto> history;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MessageDto {
        @NotBlank(message = "Role cannot be blank")
        @jakarta.validation.constraints.Pattern(
                regexp = "^(user|assistant)$",
                message = "Role must be 'user' or 'assistant'"
        )
        private String role;

        @NotBlank(message = "Content cannot be blank")
        @Size(max = 4000, message = "Content must not exceed 4000 characters")
        private String content;
    }
}
