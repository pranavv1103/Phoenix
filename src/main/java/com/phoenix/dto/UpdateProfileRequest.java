package com.phoenix.dto;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String bio;
    private String avatarUrl;
    private String websiteUrl;
}
