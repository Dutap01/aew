package com.example.webapp.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.webapp.dto.PageResponse;
import com.example.webapp.dto.StudentSummary;
import com.example.webapp.jooq.enums.StudentStatus;
import com.example.webapp.repository.StudentRepository;

@Service
public class StudentService {

    public static final int MAX_PAGE_SIZE = 100;

    private final StudentRepository students;

    public StudentService(StudentRepository students) {
        this.students = students;
    }

    /** 대표·상담실장용 학생 검색 (전체 학생, 연락처 포함) */
    @Transactional(readOnly = true)
    public PageResponse<StudentSummary> search(String q, StudentStatus status, int page, int size) {
        int safeSize = Math.clamp(size, 1, MAX_PAGE_SIZE);
        int safePage = Math.max(page, 0);
        var condition = StudentRepository.searchCondition(q, status);
        long total = students.count(condition);
        var items = students.find(condition, safePage * safeSize, safeSize);
        return new PageResponse<>(items, total, safePage, safeSize);
    }
}
