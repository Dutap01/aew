package com.example.webapp.service;

import static com.example.webapp.jooq.Tables.CLASSES;

import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.webapp.dto.appointment.StaffOption;
import com.example.webapp.dto.classes.ClassDetail;
import com.example.webapp.dto.classes.ClassScheduleSlot;
import com.example.webapp.dto.classes.ClassSummary;
import com.example.webapp.dto.classes.ClassUpsertRequest;
import com.example.webapp.repository.ClassRepository;

/**
 * 반 구성: 반 이름·레벨·담당 강사·정원·수업 요일과 시간.
 * 조회는 대표·상담실장, 등록·수정은 대표만 (SecurityConfig).
 * 개인 시간표는 이 데이터(classes + class_schedules + enrollments)에서 계산하므로, 저장할 때 시간이 겹치지 않게 막는다:
 *   같은 반 안에서 같은 요일 시간이 겹치면 안 되고, 같은 강사의 다른 운영 중 반과도 겹치면 안 된다.
 */
@Service
public class ClassService {

    private static final String[] WEEKDAY = {"", "월", "화", "수", "목", "금", "토", "일"};

    private final DSLContext dsl;
    private final ClassRepository classes;
    private final AuditService audit;

    public ClassService(DSLContext dsl, ClassRepository classes, AuditService audit) {
        this.dsl = dsl;
        this.classes = classes;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<ClassSummary> list(boolean includeInactive) {
        return classes.summaries(includeInactive ? DSL.noCondition() : CLASSES.ACTIVE.isTrue());
    }

    @Transactional(readOnly = true)
    public ClassDetail detail(UUID id) {
        var info = classes.summary(id).orElseThrow(ClassService::notFound);
        return new ClassDetail(info, classes.currentStudents(id));
    }

    @Transactional(readOnly = true)
    public List<StaffOption> teachers() {
        return classes.teachers();
    }

    @Transactional(readOnly = true)
    public List<String> levels() {
        return classes.levels();
    }

    @Transactional
    public ClassDetail create(ClassUpsertRequest req, UUID actorId) {
        String name = req.name().trim();
        var slots = validate(req, null);
        if (!req.active()) throw new ConflictException("새 반은 운영 중으로 만들어야 합니다.");
        UUID id = dsl.insertInto(CLASSES)
                .set(CLASSES.NAME, name)
                .set(CLASSES.LEVEL, req.level().trim().toUpperCase())
                .set(CLASSES.TEACHER_ID, req.teacherId())
                .set(CLASSES.CAPACITY, req.capacity())
                .returning(CLASSES.ID).fetchOne(CLASSES.ID);
        classes.replaceSchedules(id, slots);
        audit.record(actorId, "create", "classes", id, null, Map.of("name", name));
        return detail(id);
    }

    @Transactional
    public ClassDetail update(UUID id, ClassUpsertRequest req, UUID actorId) {
        var c = classes.lockById(id).orElseThrow(ClassService::notFound);
        var slots = validate(req, id);
        int current = classes.currentStudentCount(id);
        if (!req.active() && current > 0) {
            throw new ConflictException("수강 중인 학생 " + current + "명이 있어 운영 종료할 수 없습니다. 학생 반 소속을 먼저 종료하세요.");
        }
        if (req.capacity() != null && req.capacity() < current) {
            throw new ConflictException("지금 학생이 " + current + "명이라 정원을 " + req.capacity() + "명으로 줄일 수 없습니다.");
        }
        var before = Map.of("name", c.getName(), "level", c.getLevel(), "active", c.getActive(),
                "teacherId", String.valueOf(c.getTeacherId()), "capacity", String.valueOf(c.getCapacity()));
        c.setName(req.name().trim());
        c.setLevel(req.level().trim().toUpperCase());
        c.setTeacherId(req.teacherId());
        c.setCapacity(req.capacity());
        c.setActive(req.active());
        c.setUpdatedAt(OffsetDateTime.now());
        c.store();
        classes.replaceSchedules(id, slots);
        audit.record(actorId, "update", "classes", id, before, Map.of("name", c.getName(), "level", c.getLevel(),
                "active", c.getActive(), "teacherId", String.valueOf(c.getTeacherId()), "capacity", String.valueOf(c.getCapacity()),
                "schedules", slots.stream().map(ClassService::describe).toList()));
        return detail(id);
    }

    /** 이름 중복, 담당 강사, 수업 시간 겹침 검사. 요일·시작 시각순으로 정렬한 수업 시간을 돌려준다 */
    private List<ClassScheduleSlot> validate(ClassUpsertRequest req, UUID exceptId) {
        if (classes.nameTaken(req.name().trim(), exceptId)) {
            throw new ConflictException("'" + req.name().trim() + "' 반이 이미 있습니다. 다른 이름을 쓰세요.");
        }
        if (req.teacherId() != null && !classes.isActiveTeacher(req.teacherId())) {
            throw new ConflictException("담당 강사로 고를 수 없는 계정입니다.");
        }
        var slots = req.schedules().stream()
                .sorted(Comparator.comparingInt(ClassScheduleSlot::weekday).thenComparing(ClassScheduleSlot::startTime))
                .toList();
        for (int i = 0; i < slots.size(); i++) {
            var s = slots.get(i);
            if (!s.endTime().isAfter(s.startTime())) {
                throw new ConflictException(describe(s) + ": 끝 시각이 시작 시각보다 늦어야 합니다.");
            }
            if (i > 0 && overlaps(slots.get(i - 1), s)) {
                throw new ConflictException(describe(slots.get(i - 1)) + "과 " + describe(s) + " 수업 시간이 겹칩니다.");
            }
        }
        // 운영 종료하는 반은 시간표에 나오지 않으므로 강사 시간 겹침을 보지 않는다
        if (req.teacherId() != null && req.active()) {
            for (var other : classes.teacherSchedules(req.teacherId(), exceptId)) {
                for (var s : slots) {
                    if (overlaps(other.getValue(), s)) {
                        throw new ConflictException("담당 강사가 같은 시간에 '" + other.getKey() + "' 반 수업이 있습니다 ("
                                + describe(other.getValue()) + ").");
                    }
                }
            }
        }
        return slots;
    }

    /** 같은 요일에 시간이 겹치는지 (바로 이어지는 시간은 괜찮다) */
    static boolean overlaps(ClassScheduleSlot a, ClassScheduleSlot b) {
        return a.weekday() == b.weekday() && a.startTime().isBefore(b.endTime()) && b.startTime().isBefore(a.endTime());
    }

    static String describe(ClassScheduleSlot s) {
        return WEEKDAY[s.weekday()] + " " + s.startTime() + "~" + s.endTime();
    }

    private static NotFoundException notFound() {
        return new NotFoundException("반을 찾을 수 없습니다.");
    }
}
