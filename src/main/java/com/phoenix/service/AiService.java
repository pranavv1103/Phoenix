package com.phoenix.service;

import com.phoenix.dto.AiChatRequest;
import com.phoenix.dto.AiChatResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiService {

    private static final String OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
    private static final String SYSTEM_PROMPT =
            "You are Phoenix AI, an intelligent writing assistant integrated into the Phoenix Blog Platform. " +
            "You help bloggers write, edit, and improve their posts. You can: " +
            "generate blog post drafts from prompts, analyze and improve existing content, " +
            "suggest titles and tags, help with code snippets, proofread text, and answer any writing-related questions. " +
            "Be concise, helpful, and friendly.";

    @Value("${openai.api.key:}")
    private String openAiApiKey;

    private final RestTemplate restTemplate;

    @SuppressWarnings("unchecked")
    public AiChatResponse chat(AiChatRequest request) {
        if (openAiApiKey == null || openAiApiKey.isBlank()) {
            return AiChatResponse.builder()
                    .reply("AI assistant is not configured. Please set the OPENAI_API_KEY environment variable.")
                    .build();
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(openAiApiKey);

        List<Map<String, String>> messages = buildMessages(request);

        Map<String, Object> body = new HashMap<>();
        body.put("model", "gpt-4o-mini");
        body.put("messages", messages);
        body.put("max_tokens", 1500);
        body.put("temperature", 0.7);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(OPENAI_API_URL, entity, Map.class);
            Map<String, Object> responseBody = response.getBody();

            if (responseBody != null && responseBody.containsKey("choices")) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
                if (!choices.isEmpty()) {
                    Map<String, Object> choice = choices.get(0);
                    Map<String, String> message = (Map<String, String>) choice.get("message");
                    String reply = message.get("content");
                    return AiChatResponse.builder().reply(reply).build();
                }
            }
            return AiChatResponse.builder().reply("No response from AI. Please try again.").build();
        } catch (Exception e) {
            log.error("Error calling OpenAI API", e);
            return AiChatResponse.builder()
                    .reply("Failed to reach AI service. Please check your configuration and try again.")
                    .build();
        }
    }

    private List<Map<String, String>> buildMessages(AiChatRequest request) {
        List<Map<String, String>> messages = new ArrayList<>();

        Map<String, String> systemMessage = new HashMap<>();
        systemMessage.put("role", "system");
        systemMessage.put("content", SYSTEM_PROMPT);
        messages.add(systemMessage);

        if (request.getHistory() != null) {
            for (AiChatRequest.MessageDto historyMsg : request.getHistory()) {
                Map<String, String> msg = new HashMap<>();
                msg.put("role", historyMsg.getRole());
                msg.put("content", historyMsg.getContent());
                messages.add(msg);
            }
        }

        Map<String, String> userMessage = new HashMap<>();
        userMessage.put("role", "user");
        userMessage.put("content", request.getMessage());
        messages.add(userMessage);

        return messages;
    }
}
