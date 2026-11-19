package com.example.webapp.service;

/** 지금 상태에서 할 수 없는 요청 (예: 허용되지 않는 상태 변경, 이미 연결된 학생) → 409 */
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
