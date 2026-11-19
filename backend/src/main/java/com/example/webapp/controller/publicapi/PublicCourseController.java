package com.example.webapp.controller.publicapi;

import java.util.List;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.webapp.dto.course.CourseLevel;
import com.example.webapp.repository.CourseRepository;

/** 메인·강의 소개 페이지용 공개 API (로그인 없음) */
@RestController
@RequestMapping("/api/public/courses")
public class PublicCourseController {

    private final CourseRepository courses;

    public PublicCourseController(CourseRepository courses) {
        this.courses = courses;
    }

    /** 레벨별 운영 반(요일·시간)과 회차 커리큘럼 */
    @GetMapping
    @Transactional(readOnly = true)
    public List<CourseLevel> levels() {
        return courses.levels();
    }
}
