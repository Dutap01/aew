package com.example.webapp.service;

/** 대상이 없음 → 404 */
public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) {
        super(message);
    }
}
