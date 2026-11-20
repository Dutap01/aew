package com.example.webapp.dto.classes;

import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/** 반 목록 한 줄. studentCount: 지금 소속 학생 수 (종료일 없는 enrollments) */
public record ClassSummary(
        UUID id,
        String name,
        String level,
        @Schema(types = {"string", "null"}, format = "uuid") UUID teacherId,
        @Schema(types = {"string", "null"}) String teacherName,
        @Schema(types = {"integer", "null"}) Integer capacity,
        boolean active,
        List<ClassScheduleSlot> schedules,
        int studentCount) {
}
