package com.example.webapp.dto.inquiry;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/** 접수 → 학생. existingStudentId 가 있으면 기존 학생과 연결, 없으면 신청 내용으로 새 학생 등록 */
public record LinkStudentRequest(@Schema(types = {"string", "null"}, format = "uuid") UUID existingStudentId) {
}
