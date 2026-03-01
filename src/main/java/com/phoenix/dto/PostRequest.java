package com.phoenix.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PostRequest {

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Content is required")
    private String content;

    @JsonProperty("isPremium")
    private boolean isPremium = false;

    private int price = 0;

    private List<String> tags = new ArrayList<>();

    private boolean saveAsDraft = false;

    private String coverImageUrl;
}
