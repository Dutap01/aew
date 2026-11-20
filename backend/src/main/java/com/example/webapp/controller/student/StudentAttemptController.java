package com.example.webapp.controller.student;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.webapp.dto.test.AnswerRequest;
import com.example.webapp.dto.test.StudentAttempt;
import com.example.webapp.security.AppUser;
import com.example.webapp.service.StudentAttemptService;

import jakarta.validation.Valid;

/** 학생 레벨테스트 응시 (/api/s/** 는 학생만, 본인 것만) */
@RestController
@RequestMapping("/api/s/attempts")
public class StudentAttemptController {

    private final StudentAttemptService service;

    public StudentAttemptController(StudentAttemptService service) {
        this.service = service;
    }

    @GetMapping
    public List<StudentAttempt> mine(@AuthenticationPrincipal AppUser user) {
        return service.mine(user.id());
    }

    /** 시작 전에는 문항 없이 안내만, 응시 중이면 문항과 저장된 답 */
    @GetMapping("/{id}")
    public StudentAttempt get(@PathVariable UUID id, @AuthenticationPrincipal AppUser user) {
        return service.get(id, user.id());
    }

    @PostMapping("/{id}/start")
    public StudentAttempt start(@PathVariable UUID id, @AuthenticationPrincipal AppUser user) {
        return service.start(id, user.id());
    }

    /** 답 하나 저장 (자동 저장) */
    @PutMapping("/{id}/answers")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void answer(@PathVariable UUID id, @Valid @RequestBody AnswerRequest req, @AuthenticationPrincipal AppUser user) {
        service.answer(id, req, user.id());
    }

    @PostMapping("/{id}/submit")
    public StudentAttempt submit(@PathVariable UUID id, @AuthenticationPrincipal AppUser user) {
        return service.submit(id, user.id());
    }
}
