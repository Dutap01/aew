package com.example.webapp.dto.timetable;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 개인 주간 시간표 (월~일). 따로 입력하지 않고 반·수업 시간·반 소속에서 계산한다.
 * weekStart: 그 주 월요일. entries: 요일·시작 시각순
 */
public record Timetable(TimetableOwner owner, LocalDate weekStart, List<TimetableEntry> entries) {

    public enum OwnerKind { student, teacher }

    /** detail: 학생은 "S-0001 · 한빛중 · 중2" 처럼, 강사는 null */
    public record TimetableOwner(OwnerKind kind, UUID id, String name, @Schema(types = {"string", "null"}) String detail) {
    }

    /**
     * 수업 한 칸. date 는 이번 주의 실제 날짜.
     * teacherName 은 학생 시간표에서, studentCount 는 강사 시간표에서만 채운다 (나머지는 null)
     */
    public record TimetableEntry(
            UUID classId,
            String className,
            String level,
            LocalDate date,
            int weekday,
            @Schema(type = "string", example = "16:00") LocalTime startTime,
            @Schema(type = "string", example = "17:30") LocalTime endTime,
            @Schema(types = {"string", "null"}) String teacherName,
            @Schema(types = {"integer", "null"}) Integer studentCount) {
    }
}
