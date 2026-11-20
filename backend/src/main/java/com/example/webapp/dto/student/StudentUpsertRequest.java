package com.example.webapp.dto.student;

import com.example.webapp.jooq.enums.StudentStatus;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** 학생 등록·수정. status 가 없으면 등록 시 상담중, 수정 시 그대로 */
public record StudentUpsertRequest(
        @NotBlank(message = "학생 이름을 입력하세요.") @Size(max = 30, message = "30자 이내로 입력하세요.") String name,
        @Schema(types = {"string", "null"}) @Size(max = 40, message = "40자 이내로 입력하세요.") String school,
        @Schema(types = {"string", "null"}) @Size(max = 10, message = "10자 이내로 입력하세요.") String grade,
        @Schema(types = {"string", "null"}) @Size(max = 30, message = "30자 이내로 입력하세요.") String parentName,
        @Schema(types = {"string", "null"})
        @Pattern(regexp = "^$|^01[016789]-?\\d{3,4}-?\\d{4}$", message = "휴대폰 번호 형식이 올바르지 않습니다. (예: 010-1234-5678)")
        String parentPhone,
        @Schema(types = {"string", "null"}) StudentStatus status,
        @Schema(types = {"string", "null"}) @Size(max = 2000, message = "2000자 이내로 입력하세요.") String memo) {
}
