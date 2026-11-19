package com.example.webapp.controller.admin;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
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

import com.example.webapp.dto.appointment.AppointmentCreateRequest;
import com.example.webapp.dto.appointment.AppointmentResponse;
import com.example.webapp.dto.appointment.AppointmentStatusRequest;
import com.example.webapp.dto.appointment.AppointmentUpdateRequest;
import com.example.webapp.dto.appointment.StaffOption;
import com.example.webapp.security.AppUser;
import com.example.webapp.service.AppointmentService;

import jakarta.validation.Valid;

/** 상담 달력 (대표·상담실장) */
@RestController
@RequestMapping("/api/admin/appointments")
public class AdminAppointmentController {

    private final AppointmentService service;

    public AdminAppointmentController(AppointmentService service) {
        this.service = service;
    }

    /** [from, to) 와 겹치는 일정 (최대 62일). 예: from=2026-11-01T00:00+09:00 */
    @GetMapping
    public List<AppointmentResponse> range(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to,
            @RequestParam(required = false) UUID counselorId) {
        return service.range(from, to, counselorId);
    }

    /** 담당자로 고를 수 있는 사람 (대표·상담실장) */
    @GetMapping("/counselors")
    public List<StaffOption> counselors() {
        return service.counselors();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AppointmentResponse create(@Valid @RequestBody AppointmentCreateRequest request, @AuthenticationPrincipal AppUser user) {
        return service.create(request, user.id());
    }

    @PutMapping("/{id}")
    public AppointmentResponse update(@PathVariable UUID id, @Valid @RequestBody AppointmentUpdateRequest request,
            @AuthenticationPrincipal AppUser user) {
        return service.update(id, request, user.id());
    }

    @PutMapping("/{id}/status")
    public AppointmentResponse changeStatus(@PathVariable UUID id, @Valid @RequestBody AppointmentStatusRequest request,
            @AuthenticationPrincipal AppUser user) {
        return service.changeStatus(id, request.status(), user.id());
    }
}
