package com.example.webapp.controller.admin;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.webapp.dto.PageResponse;
import com.example.webapp.dto.notification.NotificationCounts;
import com.example.webapp.dto.notification.NotificationResponse;
import com.example.webapp.jooq.enums.NotificationStatus;
import com.example.webapp.notification.NotificationAdminService;
import com.example.webapp.security.AppUser;

/** 발송 이력·재발송 (대표·상담실장) */
@RestController
@RequestMapping("/api/admin/notifications")
public class AdminNotificationController {

    private final NotificationAdminService service;

    public AdminNotificationController(NotificationAdminService service) {
        this.service = service;
    }

    /** 최신순. q: 받는 번호·내용, status */
    @GetMapping
    public PageResponse<NotificationResponse> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) NotificationStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.search(q, status, page, size);
    }

    @GetMapping("/counts")
    public NotificationCounts counts(@RequestParam(required = false) String q) {
        return service.counts(q);
    }

    @PostMapping("/{id}/resend")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resend(@PathVariable UUID id, @AuthenticationPrincipal AppUser user) {
        service.resend(id, user.id());
    }
}
