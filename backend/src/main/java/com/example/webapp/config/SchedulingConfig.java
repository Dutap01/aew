package com.example.webapp.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** @Scheduled 작업 켜기 (알림 발송 워커, 이후 AI 작업 워커·리포트 생성) */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
