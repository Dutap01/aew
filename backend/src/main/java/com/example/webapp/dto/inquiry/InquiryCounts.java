package com.example.webapp.dto.inquiry;

/** 상태별 접수 건수 (목록 탭) */
public record InquiryCounts(long received, long contacted, long scheduled, long completed, long canceled) {
}
