package com.example.webapp.controller.admin;

import java.util.UUID;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.webapp.dto.PageResponse;
import com.example.webapp.dto.inquiry.InquiryCounts;
import com.example.webapp.dto.inquiry.InquiryDetail;
import com.example.webapp.dto.inquiry.InquiryStatusChangeRequest;
import com.example.webapp.dto.inquiry.InquirySummary;
import com.example.webapp.dto.inquiry.LinkStudentRequest;
import com.example.webapp.dto.inquiry.NoteCreateRequest;
import com.example.webapp.jooq.enums.InquiryStatus;
import com.example.webapp.jooq.enums.InquiryType;
import com.example.webapp.security.AppUser;
import com.example.webapp.service.InquiryService;

import jakarta.validation.Valid;

/** 접수 관리 (대표·상담실장) */
@RestController
@RequestMapping("/api/admin/inquiries")
public class AdminInquiryController {

    private final InquiryService inquiryService;

    public AdminInquiryController(InquiryService inquiryService) {
        this.inquiryService = inquiryService;
    }

    /** 접수 목록: q(학생·신청자 이름, 학교, 연락처), status, type, page, size. 최신 접수 먼저 */
    @GetMapping
    public PageResponse<InquirySummary> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) InquiryStatus status,
            @RequestParam(required = false) InquiryType type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return inquiryService.search(q, status, type, page, size);
    }

    /** 상태별 건수 (목록 탭) */
    @GetMapping("/counts")
    public InquiryCounts counts(@RequestParam(required = false) String q, @RequestParam(required = false) InquiryType type) {
        return inquiryService.counts(q, type);
    }

    @GetMapping("/{id}")
    public InquiryDetail detail(@PathVariable UUID id) {
        return inquiryService.detail(id);
    }

    @PutMapping("/{id}/status")
    public InquiryDetail changeStatus(@PathVariable UUID id, @Valid @RequestBody InquiryStatusChangeRequest request,
            @AuthenticationPrincipal AppUser user) {
        return inquiryService.changeStatus(id, request.status(), user.id());
    }

    @PostMapping("/{id}/notes")
    public InquiryDetail addNote(@PathVariable UUID id, @Valid @RequestBody NoteCreateRequest request,
            @AuthenticationPrincipal AppUser user) {
        return inquiryService.addNote(id, request.content(), user.id());
    }

    /** 학생 등록(새 학생) 또는 기존 학생 연결 */
    @PostMapping("/{id}/student")
    public InquiryDetail linkStudent(@PathVariable UUID id, @RequestBody LinkStudentRequest request,
            @AuthenticationPrincipal AppUser user) {
        return inquiryService.linkStudent(id, request.existingStudentId(), user.id());
    }
}
