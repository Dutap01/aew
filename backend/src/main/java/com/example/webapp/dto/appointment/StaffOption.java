package com.example.webapp.dto.appointment;

import java.util.UUID;

import com.example.webapp.jooq.enums.UserRole;

/** 담당자 선택 목록 (대표·상담실장) */
public record StaffOption(UUID id, String name, UserRole role) {
}
