package com.example.webapp.dto;

import java.util.List;

/** 목록 응답 공통 형식. page 는 0부터 */
public record PageResponse<T>(List<T> items, long total, int page, int size) {
}
