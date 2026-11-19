package com.example.webapp.dto.inquiry;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NoteCreateRequest(
        @NotBlank(message = "내용을 입력하세요.") @Size(max = 2000, message = "2000자 이내로 입력하세요.") String content) {
}
