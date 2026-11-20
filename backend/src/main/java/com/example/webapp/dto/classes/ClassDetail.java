package com.example.webapp.dto.classes;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.example.webapp.jooq.enums.StudentStatus;

import io.swagger.v3.oas.annotations.media.Schema;

/** 반 상세: 반 정보 + 지금 소속 학생 (이름순) */
public record ClassDetail(ClassSummary info, List<ClassStudent> students) {

    public record ClassStudent(
            UUID enrollmentId,
            UUID studentId,
            String studentCode,
            String name,
            @Schema(types = {"string", "null"}) String school,
            @Schema(types = {"string", "null"}) String grade,
            StudentStatus status,
            LocalDate startDate) {
    }
}
