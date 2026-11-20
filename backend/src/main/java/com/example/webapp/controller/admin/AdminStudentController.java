package com.example.webapp.controller.admin;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.webapp.dto.PageResponse;
import com.example.webapp.dto.StudentSummary;
import com.example.webapp.dto.inquiry.NoteCreateRequest;
import com.example.webapp.dto.student.EnrollmentCreateRequest;
import com.example.webapp.dto.student.EnrollmentEndRequest;
import com.example.webapp.dto.student.StudentDetail;
import com.example.webapp.dto.student.StudentUpsertRequest;
import com.example.webapp.jooq.enums.StudentStatus;
import com.example.webapp.security.AppUser;
import com.example.webapp.service.StudentService;

import jakarta.validation.Valid;

/**
 * 대표·상담실장 학생 관리 (/api/admin/** 는 SecurityConfig 에서 OWNER·COUNSELOR 만 허용).
 * 반 소속 추가·종료(/enrollments)는 대표만.
 */
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

    /** 학생 상세: 기본 정보, 반 소속, 타임라인 */
    @GetMapping("/{id}")
    public StudentDetail detail(@PathVariable UUID id) {
        return studentService.detail(id);
    }

    /** 학생 직접 등록 (접수 없이 온 학생) */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StudentDetail create(@Valid @RequestBody StudentUpsertRequest request, @AuthenticationPrincipal AppUser user) {
        return studentService.create(request, user.id());
    }

    /** 기본 정보·상태 수정 */
    @PutMapping("/{id}")
    public StudentDetail update(@PathVariable UUID id, @Valid @RequestBody StudentUpsertRequest request,
            @AuthenticationPrincipal AppUser user) {
        return studentService.update(id, request, user.id());
    }

    @PostMapping("/{id}/notes")
    public StudentDetail addNote(@PathVariable UUID id, @Valid @RequestBody NoteCreateRequest request,
            @AuthenticationPrincipal AppUser user) {
        return studentService.addNote(id, request.content(), user.id());
    }

    /** 반에 넣기 (대표) */
    @PostMapping("/{id}/enrollments")
    public StudentDetail enroll(@PathVariable UUID id, @Valid @RequestBody EnrollmentCreateRequest request,
            @AuthenticationPrincipal AppUser user) {
        return studentService.enroll(id, request.classId(), request.startDate(), user.id());
    }

    /** 반 소속 종료 (대표) */
    @PutMapping("/{id}/enrollments/{enrollmentId}/end")
    public StudentDetail endEnrollment(@PathVariable UUID id, @PathVariable UUID enrollmentId,
            @RequestBody EnrollmentEndRequest request, @AuthenticationPrincipal AppUser user) {
        return studentService.endEnrollment(id, enrollmentId, request.endDate(), user.id());
    }
}
