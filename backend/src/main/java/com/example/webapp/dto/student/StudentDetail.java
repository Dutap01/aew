package com.example.webapp.dto.student;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import com.example.webapp.dto.classes.ClassScheduleSlot;
import com.example.webapp.jooq.enums.StudentStatus;

import io.swagger.v3.oas.annotations.media.Schema;

/** 학생 상세 (대표·상담실장): 기본 정보 + 반 소속 이력 + 타임라인 */
public record StudentDetail(
        UUID id,
        String studentCode,
        String name,
        @Schema(types = {"string", "null"}) String school,
        @Schema(types = {"string", "null"}) String grade,
        @Schema(types = {"string", "null"}) String parentName,
        @Schema(types = {"string", "null"}) String parentPhone,
        StudentStatus status,
        @Schema(types = {"string", "null"}) String memo,
        /** 학생 로그인 아이디 (계정 발급 전에는 null) */
        @Schema(types = {"string", "null"}) String loginId,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        /** 반 소속: 지금 소속 먼저, 그다음 지난 소속 (최근 종료 먼저) */
        List<Enrollment> enrollments,
        /** 접수부터 지금까지 있었던 일 (최신 먼저) */
        List<TimelineEvent> timeline) {

    public record Enrollment(
            UUID id,
            UUID classId,
            String className,
            String level,
            @Schema(types = {"string", "null"}) String teacherName,
            List<ClassScheduleSlot> schedules,
            LocalDate startDate,
            @Schema(types = {"string", "null"}, format = "date") LocalDate endDate) {
    }

    public enum TimelineKind { created, inquiry, note, appointment, enrollment_start, enrollment_end, status_change }

    /** refId: 접수·일정 id 처럼 화면에서 이동할 대상 (없으면 null) */
    public record TimelineEvent(
            TimelineKind kind,
            OffsetDateTime at,
            String title,
            @Schema(types = {"string", "null"}) String detail,
            @Schema(types = {"string", "null"}) String actorName,
            @Schema(types = {"string", "null"}, format = "uuid") UUID refId) {
    }
}
