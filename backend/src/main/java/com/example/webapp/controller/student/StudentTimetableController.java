package com.example.webapp.controller.student;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.webapp.dto.timetable.Timetable;
import com.example.webapp.security.AppUser;
import com.example.webapp.service.TimetableService;

/** 학생 본인 시간표 (/api/s/** 는 학생만). 다른 학생 것은 볼 수 없다 (로그인 계정으로만 찾음) */
@RestController
@RequestMapping("/api/s/timetable")
public class StudentTimetableController {

    private final TimetableService timetables;

    public StudentTimetableController(TimetableService timetables) {
        this.timetables = timetables;
    }

    @GetMapping
    public Timetable mine(@AuthenticationPrincipal AppUser user,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate week) {
        return timetables.forStudentProfile(user.id(), week);
    }
}
