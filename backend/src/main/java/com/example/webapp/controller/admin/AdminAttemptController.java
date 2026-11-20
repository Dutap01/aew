package com.example.webapp.controller.admin;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.webapp.dto.PageResponse;
import com.example.webapp.dto.test.AttemptCounts;
import com.example.webapp.dto.test.AttemptDetail;
import com.example.webapp.dto.test.AttemptIssueRequest;
import com.example.webapp.dto.test.AttemptIssuedResponse;
import com.example.webapp.dto.test.AttemptSummary;
import com.example.webapp.dto.test.ManualScoreRequest;
import com.example.webapp.dto.test.TestOption;
import com.example.webapp.jooq.enums.AttemptStatus;
import com.example.webapp.security.AppUser;
import com.example.webapp.service.AttemptService;

import jakarta.validation.Valid;

/** 레벨테스트 발급·응시 결과 (대표·상담실장) */
@RestController
public class AdminAttemptController {

    private final AttemptService attemptService;

    public AdminAttemptController(AttemptService attemptService) {
        this.attemptService = attemptService;
    }

    /** 발급할 수 있는 레벨테스트 */
    @GetMapping("/api/admin/tests/level")
    public List<TestOption> levelTests() {
        return attemptService.levelTests();
    }

    /** 응시 목록: q(학생 이름·코드), status, page, size. 최근 발급 먼저 */
    @GetMapping("/api/admin/attempts")
    public PageResponse<AttemptSummary> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) AttemptStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return attemptService.search(q, status, page, size);
    }

    @GetMapping("/api/admin/attempts/counts")
    public AttemptCounts counts(@RequestParam(required = false) String q) {
        return attemptService.counts(q);
    }

    @GetMapping("/api/admin/attempts/{id}")
    public AttemptDetail detail(@PathVariable UUID id) {
        return attemptService.detail(id);
    }

    /** 학생의 응시 (최근 발급 먼저) */
    @GetMapping("/api/admin/students/{studentId}/attempts")
    public List<AttemptSummary> byStudent(@PathVariable UUID studentId) {
        return attemptService.byStudent(studentId);
    }

    @PostMapping("/api/admin/attempts")
    @ResponseStatus(HttpStatus.CREATED)
    public AttemptIssuedResponse issue(@Valid @RequestBody AttemptIssueRequest req, @AuthenticationPrincipal AppUser user) {
        return attemptService.issue(req.studentId(), req.testId(), req.inquiryId(), user.id());
    }

    /** 레벨테스트 계정 다시 발급 (새 비밀번호, 사용 시간 다시 시작) */
    @PostMapping("/api/admin/attempts/{id}/account")
    public AttemptIssuedResponse reissueAccount(@PathVariable UUID id, @AuthenticationPrincipal AppUser user) {
        return attemptService.reissueAccount(id, user.id());
    }

    /** 시작 전 응시 취소 */
    @DeleteMapping("/api/admin/attempts/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancel(@PathVariable UUID id, @AuthenticationPrincipal AppUser user) {
        attemptService.cancel(id, user.id());
    }

    /** 응시 중인 것을 대신 제출 */
    @PostMapping("/api/admin/attempts/{id}/submit")
    public AttemptDetail forceSubmit(@PathVariable UUID id, @AuthenticationPrincipal AppUser user) {
        return attemptService.forceSubmit(id, user.id());
    }

    /** 서술형 채점 */
    @PutMapping("/api/admin/attempts/{id}/items/{itemId}/score")
    public AttemptDetail manualScore(@PathVariable UUID id, @PathVariable UUID itemId,
            @Valid @RequestBody ManualScoreRequest req, @AuthenticationPrincipal AppUser user) {
        return attemptService.manualScore(id, itemId, req.score(), user.id());
    }
}
