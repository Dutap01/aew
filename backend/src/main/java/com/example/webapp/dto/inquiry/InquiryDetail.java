package com.example.webapp.dto.inquiry;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import com.example.webapp.dto.appointment.AppointmentResponse;
import com.example.webapp.dto.test.AttemptSummary;
import com.example.webapp.jooq.enums.InquiryStatus;
import com.example.webapp.jooq.enums.InquiryType;
import com.example.webapp.jooq.enums.StudentStatus;

import io.swagger.v3.oas.annotations.media.Schema;

/** 접수 상세: 신청 내용 + 상담 기록 + 연결된 학생 + 같은 사람으로 보이는 기존 학생 */
public record InquiryDetail(
        UUID id,
        InquiryType type,
        InquiryStatus status,
        String applicantName,
        String applicantPhone,
        String studentName,
        @Schema(types = {"string", "null"}) String school,
        @Schema(types = {"string", "null"}) String grade,
        List<PreferredSlot> preferredSlots,
        @Schema(types = {"string", "null"}) String message,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        /** 지금 상태에서 바꿀 수 있는 상태 */
        List<InquiryStatus> nextStatuses,
        @Schema(types = {"object", "null"}) LinkedStudent student,
        /** 학생이 아직 연결되지 않았을 때: 학부모 연락처 또는 이름+학교가 같은 기존 학생 */
        List<LinkedStudent> similarStudents,
        List<InquiryNote> notes,
        /** 이 접수로 잡은 상담·레벨테스트 일정 (시간순) */
        List<AppointmentResponse> appointments,
        /** 이 접수로 발급한 레벨테스트 (최근 먼저) */
        List<AttemptSummary> levelTests) {

    public record LinkedStudent(UUID id, String studentCode, String name,
            @Schema(types = {"string", "null"}) String school,
            @Schema(types = {"string", "null"}) String grade,
            StudentStatus status,
            /** 학생 로그인 아이디 (계정 발급 전에는 null) */
            @Schema(types = {"string", "null"}) String loginId) {
    }

    public record InquiryNote(UUID id, String content, String authorName, OffsetDateTime createdAt) {
    }
}
