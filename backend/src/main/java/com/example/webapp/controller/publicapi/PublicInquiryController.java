package com.example.webapp.controller.publicapi;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.webapp.dto.inquiry.InquiryCreateRequest;
import com.example.webapp.dto.inquiry.InquiryCreatedResponse;
import com.example.webapp.service.InquiryService;

import jakarta.validation.Valid;

/** 로그인 없이 쓰는 상담·레벨테스트 신청 (/api/public/**) */
@RestController
@RequestMapping("/api/public/inquiries")
public class PublicInquiryController {

    private final InquiryService inquiryService;

    public PublicInquiryController(InquiryService inquiryService) {
        this.inquiryService = inquiryService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public InquiryCreatedResponse create(@Valid @RequestBody InquiryCreateRequest request) {
        return new InquiryCreatedResponse(inquiryService.create(request));
    }
}
