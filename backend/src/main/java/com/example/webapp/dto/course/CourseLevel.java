package com.example.webapp.dto.course;

import java.time.LocalTime;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 공개 강의 소개 (레벨 하나). 학생·강사 개인정보는 넣지 않는다.
 * level: 반 레벨 코드 (M1, M2 ...), 화면 주소는 소문자 (/curriculum/m1)
 */
public record CourseLevel(String level, List<CourseClass> classes, List<CurriculumItem> curriculum) {

    public record CourseClass(String name,
            @Schema(types = {"integer", "null"}) Integer capacity,
            List<CourseSchedule> schedules) {
    }

    /** weekday: ISO 1=월 … 7=일 */
    public record CourseSchedule(int weekday,
            @Schema(type = "string", example = "16:00") LocalTime startTime,
            @Schema(type = "string", example = "17:30") LocalTime endTime) {
    }

    public record CurriculumItem(int seq, String title, @Schema(types = {"string", "null"}) String description) {
    }
}
