package com.example.webapp.dto.inquiry;

import com.example.webapp.jooq.enums.InquiryStatus;

import jakarta.validation.constraints.NotNull;

public record InquiryStatusChangeRequest(@NotNull(message = "상태를 선택하세요.") InquiryStatus status) {
}
