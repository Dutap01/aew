package com.example.webapp.controller.teacher;

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

/** 강사 본인 시간표 (/api/t/** 는 강사·대표) */
@RestController
@RequestMapping("/api/t/timetable")
public class TeacherTimetableController {

    private final TimetableService timetables;

    public TeacherTimetableController(TimetableService timetables) {
        this.timetables = timetables;
    }

    @GetMapping
    public Timetable mine(@AuthenticationPrincipal AppUser user,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate week) {
        return timetables.forTeacherProfile(user.id(), user.name(), week);
    }
}
