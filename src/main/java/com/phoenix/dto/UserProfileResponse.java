package com.phoenix.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {
    private String username;
    private LocalDateTime joinedDate;
    private int totalPosts;
    private List<PostResponse> posts;
    private long followersCount;
    private long followingCount;
    private boolean followedByCurrentUser;
}
