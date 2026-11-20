package com.example.webapp.controller.admin;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.webapp.dto.settings.LevelTestSettings;
import com.example.webapp.dto.settings.TestAccountInfo;
import com.example.webapp.security.AppUser;
import com.example.webapp.service.SettingsService;
import com.example.webapp.service.TestAccountService;

import jakarta.validation.Valid;

/** 레벨테스트 설정 (대표·상담실장) */
@RestController
@RequestMapping("/api/admin/settings/level-test")
public class AdminSettingsController {

    private final SettingsService settings;
    private final TestAccountService testAccounts;

    public AdminSettingsController(SettingsService settings, TestAccountService testAccounts) {
        this.settings = settings;
        this.testAccounts = testAccounts;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public LevelTestSettings get() {
        return new LevelTestSettings(settings.levelTestAccountMinutes());
    }

    /** 바꾼 값은 이후에 발급(다시 발급)하는 계정부터 적용 */
    @PutMapping
    public LevelTestSettings update(@Valid @RequestBody LevelTestSettings req, @AuthenticationPrincipal AppUser user) {
        settings.setLevelTestAccountMinutes(req.accountMinutes(), user.id());
        return get();
    }

    /** 지금 쓸 수 있는 레벨테스트 계정 */
    @GetMapping("/accounts")
    @Transactional(readOnly = true)
    public List<TestAccountInfo> activeAccounts() {
        return testAccounts.active();
    }
}
