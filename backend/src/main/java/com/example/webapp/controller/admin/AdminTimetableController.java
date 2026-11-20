package com.example.webapp.controller.admin;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.webapp.dto.appointment.StaffOption;
import com.example.webapp.dto.timetable.Timetable;
import com.example.webapp.service.ClassService;
import com.example.webapp.service.TimetableService;

/**
 * 시간표 조회 (대표·상담실장): 학생·강사를 골라 개인 주간 시간표를 본다.
 * 학생은 /api/admin/students 검색으로, 강사는 /teachers 목록으로 고른다.
 * week: 그 주에 있는 아무 날짜 (YYYY-MM-DD, 없으면 이번 주)
 */
@RestController
@RequestMapping("/api/admin/timetables")
public class AdminTimetableController {

    private final TimetableService timetables;
    private final ClassService classService;

    public AdminTimetableController(TimetableService timetables, ClassService classService) {
        this.timetables = timetables;
        this.classService = classService;
    }

    @GetMapping("/students/{id}")
    public Timetable student(@PathVariable UUID id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate week) {
        return timetables.forStudent(id, week);
    }

    @GetMapping("/teachers/{id}")
    public Timetable teacher(@PathVariable UUID id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate week) {
        return timetables.forTeacher(id, week);
    }

    /** 시간표를 볼 수 있는 강사 (사용 중인 강사) */
    @GetMapping("/teachers")
    public List<StaffOption> teachers() {
        return classService.teachers();
    }
}
