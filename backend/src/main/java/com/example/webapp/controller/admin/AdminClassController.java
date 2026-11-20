package com.example.webapp.controller.admin;

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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.webapp.dto.appointment.StaffOption;
import com.example.webapp.dto.classes.ClassDetail;
import com.example.webapp.dto.classes.ClassSummary;
import com.example.webapp.dto.classes.ClassUpsertRequest;
import com.example.webapp.security.AppUser;
import com.example.webapp.service.ClassService;

import jakarta.validation.Valid;

/** 반 구성. 조회는 대표·상담실장, 등록·수정(POST·PUT)은 대표만 (SecurityConfig) */
@RestController
@RequestMapping("/api/admin/classes")
public class AdminClassController {

    private final ClassService classService;

    public AdminClassController(ClassService classService) {
        this.classService = classService;
    }

    /** 반 목록. all=true 면 운영 종료한 반도 (운영 중 먼저, 레벨·이름순) */
    @GetMapping
    public List<ClassSummary> list(@RequestParam(defaultValue = "false") boolean all) {
        return classService.list(all);
    }

    @GetMapping("/{id}")
    public ClassDetail detail(@PathVariable UUID id) {
        return classService.detail(id);
    }

    /** 담당 강사로 고를 수 있는 사람 */
    @GetMapping("/teachers")
    public List<StaffOption> teachers() {
        return classService.teachers();
    }

    /** 이미 쓰고 있는 레벨 코드 (M1, M2 ...) */
    @GetMapping("/levels")
    public List<String> levels() {
        return classService.levels();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClassDetail create(@Valid @RequestBody ClassUpsertRequest request, @AuthenticationPrincipal AppUser user) {
        return classService.create(request, user.id());
    }

    @PutMapping("/{id}")
    public ClassDetail update(@PathVariable UUID id, @Valid @RequestBody ClassUpsertRequest request,
            @AuthenticationPrincipal AppUser user) {
        return classService.update(id, request, user.id());
    }
}
