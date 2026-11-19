package com.example.webapp.dto.inquiry;

import java.util.List;

import com.example.webapp.jooq.enums.InquiryType;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** 공개 신청서 (POST /api/public/inquiries) */
public record InquiryCreateRequest(
        @NotNull(message = "신청 종류를 선택하세요.") InquiryType type,
        @NotBlank(message = "신청자 이름을 입력하세요.") @Size(max = 30, message = "30자 이내로 입력하세요.") String applicantName,
        @NotBlank(message = "연락처를 입력하세요.")
        @Pattern(regexp = "^01[016789]-?\\d{3,4}-?\\d{4}$", message = "휴대폰 번호 형식이 올바르지 않습니다. (예: 010-1234-5678)")
        String applicantPhone,
        @NotBlank(message = "학생 이름을 입력하세요.") @Size(max = 30, message = "30자 이내로 입력하세요.") String studentName,
        @Size(max = 40, message = "40자 이내로 입력하세요.") String school,
        @Size(max = 10) String grade,
        @NotNull @Size(min = 1, max = 3, message = "희망 일정을 1~3개 선택하세요.") List<@Valid PreferredSlot> preferredSlots,
        @Size(max = 1000, message = "1000자 이내로 입력하세요.") String message,
        @AssertTrue(message = "개인정보 수집·이용에 동의해야 신청할 수 있습니다.") boolean privacyAgreed) {
}
