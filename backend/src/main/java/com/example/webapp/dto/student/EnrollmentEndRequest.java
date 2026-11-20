package com.example.webapp.dto.student;

import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;

/** 반 소속 종료 (대표). endDate 가 없으면 오늘 */
public record EnrollmentEndRequest(@Schema(types = {"string", "null"}, format = "date") LocalDate endDate) {
}
