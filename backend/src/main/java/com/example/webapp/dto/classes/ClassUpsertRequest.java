package com.example.webapp.dto.classes;

import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** 반 등록·수정 (대표). schedules 는 통째로 바꾼다 */
public record ClassUpsertRequest(
        @NotBlank(message = "반 이름을 입력하세요.") @Size(max = 30, message = "30자 이내로 입력하세요.") String name,
        @NotBlank(message = "레벨을 입력하세요.") @Size(max = 10, message = "10자 이내로 입력하세요.") String level,
        @Schema(types = {"string", "null"}, format = "uuid") UUID teacherId,
        @Schema(types = {"integer", "null"}) @Min(value = 1, message = "정원은 1명 이상입니다.") @Max(value = 200, message = "정원은 200명 이하입니다.") Integer capacity,
        boolean active,
        @NotNull @Size(max = 14, message = "수업 시간은 14개까지 넣을 수 있습니다.") List<@Valid ClassScheduleSlot> schedules) {
}
