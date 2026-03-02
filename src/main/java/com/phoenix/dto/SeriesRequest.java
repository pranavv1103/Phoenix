package com.phoenix.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SeriesRequest {

    @NotBlank(message = "Series name is required")
    private String name;

    private String description;
}
