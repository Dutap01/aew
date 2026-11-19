package com.example.webapp.controller.admin;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.webapp.dto.PageResponse;
import com.example.webapp.dto.StudentSummary;
import com.example.webapp.jooq.enums.StudentStatus;
import com.example.webapp.service.StudentService;

/** 대표·상담실장 학생 관리 (/api/admin/** 는 SecurityConfig 에서 OWNER·COUNSELOR 만 허용) */
@RestController
@RequestMapping("/api/admin/students")
public class AdminStudentController {

    private final StudentService studentService;

    public AdminStudentController(StudentService studentService) {
        this.studentService = studentService;
    }

    /** 학생 검색: q(이름·학생 코드·학교·학부모 연락처), status, page(0부터), size(최대 100) */
    @GetMapping
    public PageResponse<StudentSummary> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) StudentStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return studentService.search(q, status, page, size);
    }
}
