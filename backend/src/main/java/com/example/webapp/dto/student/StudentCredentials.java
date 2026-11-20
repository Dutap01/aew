package com.example.webapp.dto.student;

import io.swagger.v3.oas.annotations.media.Schema;

/** 학생 로그인 정보. initialPassword 는 새로 만든 경우에만 한 번 내려준다 (DB 에는 해시만) */
public record StudentCredentials(String loginId, @Schema(types = {"string", "null"}) String initialPassword) {
}
