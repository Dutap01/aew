package com.example.webapp.service;

import static com.example.webapp.jooq.Tables.PROFILES;
import static com.example.webapp.jooq.Tables.STUDENTS;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

import org.jooq.DSLContext;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.webapp.dto.student.StudentCredentials;
import com.example.webapp.jooq.enums.UserRole;
import com.example.webapp.jooq.tables.records.StudentsRecord;

/**
 * 학생 정식 로그인 계정 (재원생: 시간표·숙제·질문). 아이디는 학생 코드(S-0001), 초기 비밀번호는 6자리 숫자.
 * 레벨테스트 전용 계정은 TestAccountService.
 * 비밀번호는 해시만 저장하므로 다시 보여줄 수 없고, 잊으면 재발급한다.
 */
@Service
public class StudentAccountService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final DSLContext dsl;
    private final PasswordEncoder encoder;
    private final AuditService audit;

    public StudentAccountService(DSLContext dsl, PasswordEncoder encoder, AuditService audit) {
        this.dsl = dsl;
        this.encoder = encoder;
        this.audit = audit;
    }

    /** 계정이 없으면 만든다 (비밀번호를 돌려줌). 있으면 resetPassword 일 때만 새 비밀번호. s 는 잠근 행이어야 한다 */
    public StudentCredentials ensure(StudentsRecord s, boolean resetPassword, UUID actorId) {
        if (s.getProfileId() == null) {
            String password = newPassword();
            UUID profileId = dsl.insertInto(PROFILES)
                    .set(PROFILES.LOGIN_ID, s.getStudentCode())
                    .set(PROFILES.PASSWORD_HASH, encoder.encode(password))
                    .set(PROFILES.ROLE, UserRole.student)
                    .set(PROFILES.NAME, s.getName())
                    .returning(PROFILES.ID).fetchOne(PROFILES.ID);
            s.setProfileId(profileId);
            s.store();
            audit.record(actorId, "create_student_account", "profiles", profileId, null, Map.of("studentId", s.getId()));
            return new StudentCredentials(s.getStudentCode(), password);
        }
        var profile = dsl.selectFrom(PROFILES).where(PROFILES.ID.eq(s.getProfileId())).fetchOne();
        if (!resetPassword) {
            return new StudentCredentials(profile.getLoginId(), null);
        }
        String password = newPassword();
        profile.setPasswordHash(encoder.encode(password));
        profile.setActive(true);
        profile.setUpdatedAt(OffsetDateTime.now());
        profile.store();
        audit.record(actorId, "reset_password", "profiles", profile.getId(), null, Map.of("studentId", s.getId()));
        return new StudentCredentials(profile.getLoginId(), password);
    }

    /** 학생 정식 계정 만들기 또는 비밀번호 재발급 (새 비밀번호를 한 번 돌려준다) */
    @Transactional
    public StudentCredentials resetPassword(UUID studentId, UUID actorId) {
        var s = dsl.selectFrom(STUDENTS).where(STUDENTS.ID.eq(studentId)).forUpdate().fetchOptional()
                .orElseThrow(() -> new NotFoundException("학생을 찾을 수 없습니다."));
        return ensure(s, true, actorId);
    }

    private static String newPassword() {
        return String.format("%06d", RANDOM.nextInt(1_000_000));
    }
}
