package com.example.webapp.dto.appointment;

import com.example.webapp.jooq.enums.AppointmentStatus;

import jakarta.validation.constraints.NotNull;

public record AppointmentStatusRequest(@NotNull(message = "상태를 선택하세요.") AppointmentStatus status) {
}
