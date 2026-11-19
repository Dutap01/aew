package com.example.webapp.dto;

import java.util.List;
import java.util.UUID;

import com.example.webapp.jooq.enums.StudentStatus;

import io.swagger.v3.oas.annotations.media.Schema;

/** 학생 목록·검색 한 줄 (운영자용: 연락처 포함) */
public record StudentSummary(
        UUID id,
        String studentCode,
        String name,
        @Schema(types = {"string", "null"}) String school,
        @Schema(types = {"string", "null"}) String grade,
        StudentStatus status,
        @Schema(types = {"string", "null"}) String parentPhone,
        /** 현재 소속 반 이름 (종료일 없는 enrollments) */
        List<String> classes) {
}
