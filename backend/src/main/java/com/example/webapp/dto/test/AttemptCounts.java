package com.example.webapp.dto.test;

/** 상태별 응시 건수 (목록 탭) */
public record AttemptCounts(int issued, int inProgress, int submitted, int graded) {
}
