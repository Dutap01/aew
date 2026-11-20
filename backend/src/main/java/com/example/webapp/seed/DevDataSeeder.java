package com.example.webapp.seed;

import static com.example.webapp.jooq.Tables.CLASSES;
import static com.example.webapp.jooq.Tables.CLASS_SCHEDULES;
import static com.example.webapp.jooq.Tables.CONSULT_APPOINTMENTS;
import static com.example.webapp.jooq.Tables.CONSULT_NOTES;
import static com.example.webapp.jooq.Tables.CURRICULUM_ITEMS;
import static com.example.webapp.jooq.Tables.ENROLLMENTS;
import static com.example.webapp.jooq.Tables.INQUIRIES;
import static com.example.webapp.jooq.Tables.ITEMS;
import static com.example.webapp.jooq.Tables.PROFILES;
import static com.example.webapp.jooq.Tables.STUDENTS;
import static com.example.webapp.jooq.Tables.TESTS;
import static com.example.webapp.jooq.Tables.TEST_ITEMS;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

import org.jooq.DSLContext;
import org.jooq.JSONB;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.example.webapp.jooq.enums.AppointmentStatus;
import com.example.webapp.jooq.enums.InquiryStatus;
import com.example.webapp.jooq.enums.InquiryType;
import com.example.webapp.jooq.enums.ItemType;
import com.example.webapp.jooq.enums.StudentStatus;
import com.example.webapp.jooq.enums.TestKind;
import com.example.webapp.jooq.enums.UserRole;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * 개발용 샘플 데이터. DB 에 계정이 하나도 없을 때만 넣는다 (app.seed.enabled=true, prod 프로파일에서는 동작 안 함).
 * <ul>
 *   <li>계정 (비밀번호 모두 1234): owner(대표), counselor(상담실장), teacher·teacher2·teacher3(강사), S-0001(학생)</li>
 *   <li>반 6개 (중1~중3 A/B) + 요일·시간</li>
 *   <li>학생 app.seed.students 명 (기본 150). 이름이 겹치는 학생도 생기도록 성·이름 조합에서 고정 난수로 생성</li>
 *   <li>상담·레벨테스트 접수 30건 (최근 2주, 상태 여러 가지). 접수 테이블이 비어 있을 때만</li>
 *   <li>레벨별(M1~M3) 회차 커리큘럼 8회차. 커리큘럼이 비어 있을 때만</li>
 *   <li>상담 달력: 예약확정·완료 접수의 일정 + 재원생 학부모 상담 몇 건. 일정이 비어 있을 때만</li>
 *   <li>임시 레벨테스트 1개 (20문항: 어휘·문법·독해, 객관식·단답형). 테스트가 비어 있을 때만. 발주처 문항이 오면 교체</li>
 * </ul>
 * 다시 만들려면 개발 컨테이너에서 pg_local reset 후 서버를 재시작한다.
 */
@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
public class DevDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);
    private static final String DEV_PASSWORD = "1234";
    private static final ObjectMapper JSON = new ObjectMapper();

    private static final String[] SURNAMES = {"김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권"};
    private static final String[] GIVEN = {"민준", "서연", "도윤", "하은", "시우", "지유", "주원", "서윤", "예준", "지아",
            "하준", "수아", "지호", "하린", "준서", "다은", "건우", "채원", "현우", "윤서", "우진", "소율", "선우", "예린"};
    private static final String[] SCHOOLS = {"한빛중", "새솔중", "푸른중", "하늘중"};

    private final DSLContext dsl;
    private final PasswordEncoder encoder;
    private final Environment env;
    private final int studentCount;

    public DevDataSeeder(DSLContext dsl, PasswordEncoder encoder, Environment env,
            @Value("${app.seed.students:150}") int studentCount) {
        this.dsl = dsl;
        this.encoder = encoder;
        this.env = env;
        this.studentCount = studentCount;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (Arrays.asList(env.getActiveProfiles()).contains("prod")) {
            log.warn("prod 프로파일에서는 샘플 데이터를 넣지 않습니다 (app.seed.enabled 무시)");
            return;
        }
        if (dsl.fetchCount(PROFILES) == 0) {
            seedBase();
        }
        if (dsl.fetchCount(INQUIRIES) == 0) {
            seedInquiries();
        }
        if (dsl.fetchCount(CURRICULUM_ITEMS) == 0) {
            seedCurriculum();
        }
        if (dsl.fetchCount(CONSULT_APPOINTMENTS) == 0) {
            seedAppointments();
        }
        if (dsl.fetchCount(TESTS) == 0) {
            seedLevelTest();
        }
    }

    private void seedAppointments() {
        ZoneId seoul = ZoneId.of("Asia/Seoul");
        UUID counselorId = dsl.select(PROFILES.ID).from(PROFILES).where(PROFILES.LOGIN_ID.eq("counselor")).fetchOne(PROFILES.ID);
        UUID ownerId = dsl.select(PROFILES.ID).from(PROFILES).where(PROFILES.LOGIN_ID.eq("owner")).fetchOne(PROFILES.ID);
        if (counselorId == null) return;
        int count = 0;
        // 접수와 연결된 일정: 희망 일정 1순위 시각 (상담 30분, 레벨테스트 60분)
        var slotDate = org.jooq.impl.DSL.field("{0}->0->>'date'", String.class, INQUIRIES.PREFERRED_SLOTS);
        var slotTime = org.jooq.impl.DSL.field("{0}->0->>'time'", String.class, INQUIRIES.PREFERRED_SLOTS);
        var inquiries = dsl.select(INQUIRIES.asterisk(), slotDate, slotTime).from(INQUIRIES)
                .where(INQUIRIES.STATUS.in(InquiryStatus.scheduled, InquiryStatus.completed))
                .orderBy(INQUIRIES.CREATED_AT).fetch();
        for (var row : inquiries) {
            var q = row.into(INQUIRIES);
            if (row.get(slotDate) == null || row.get(slotTime) == null) continue;
            OffsetDateTime start = LocalDate.parse(row.get(slotDate)).atTime(LocalTime.parse(row.get(slotTime)))
                    .atZone(seoul).toOffsetDateTime();
            int minutes = q.getType() == InquiryType.level_test ? 60 : 30;
            boolean overlaps = dsl.fetchExists(CONSULT_APPOINTMENTS, CONSULT_APPOINTMENTS.COUNSELOR_ID.eq(counselorId)
                    .and(CONSULT_APPOINTMENTS.STARTS_AT.lt(start.plusMinutes(minutes))).and(CONSULT_APPOINTMENTS.ENDS_AT.gt(start)));
            dsl.insertInto(CONSULT_APPOINTMENTS)
                    .set(CONSULT_APPOINTMENTS.KIND, q.getType())
                    .set(CONSULT_APPOINTMENTS.INQUIRY_ID, q.getId())
                    .set(CONSULT_APPOINTMENTS.COUNSELOR_ID, overlaps && ownerId != null ? ownerId : counselorId)
                    .set(CONSULT_APPOINTMENTS.TITLE, q.getStudentName() + (q.getType() == InquiryType.level_test ? " 레벨테스트" : " 상담"))
                    .set(CONSULT_APPOINTMENTS.STARTS_AT, start)
                    .set(CONSULT_APPOINTMENTS.ENDS_AT, start.plusMinutes(minutes))
                    .set(CONSULT_APPOINTMENTS.STATUS, q.getStatus() == InquiryStatus.completed ? AppointmentStatus.done : AppointmentStatus.scheduled)
                    .set(CONSULT_APPOINTMENTS.CREATED_BY, counselorId)
                    .execute();
            count++;
        }
        // 접수 없는 재원생 학부모 상담: 이번 주·다음 주 평일 오후
        var students = dsl.select(STUDENTS.ID, STUDENTS.NAME).from(STUDENTS)
                .where(STUDENTS.STATUS.eq(StudentStatus.enrolled)).orderBy(STUDENTS.STUDENT_CODE).limit(6).fetch();
        LocalDate monday = LocalDate.now(seoul).with(java.time.DayOfWeek.MONDAY);
        for (int i = 0; i < students.size(); i++) {
            OffsetDateTime start = monday.plusDays(i * 2L + (i >= 3 ? 1 : 0)).atTime(13 + i % 3, i % 2 == 0 ? 0 : 30)
                    .atZone(seoul).toOffsetDateTime();
            dsl.insertInto(CONSULT_APPOINTMENTS)
                    .set(CONSULT_APPOINTMENTS.KIND, InquiryType.consult)
                    .set(CONSULT_APPOINTMENTS.STUDENT_ID, students.get(i).value1())
                    .set(CONSULT_APPOINTMENTS.COUNSELOR_ID, i % 3 == 2 && ownerId != null ? ownerId : counselorId)
                    .set(CONSULT_APPOINTMENTS.TITLE, students.get(i).value2() + " 학부모 상담")
                    .set(CONSULT_APPOINTMENTS.STARTS_AT, start)
                    .set(CONSULT_APPOINTMENTS.ENDS_AT, start.plusMinutes(30))
                    .set(CONSULT_APPOINTMENTS.MEMO, "중간 학습 점검")
                    .set(CONSULT_APPOINTMENTS.CREATED_BY, counselorId)
                    .execute();
            count++;
        }
        log.info("개발용 샘플 상담 일정 {}건 생성", count);
    }

    /**
     * 임시 레벨테스트 (중등 공통, 30분). 발주처 문항·정답을 받기 전까지 화면·채점 흐름 확인용.
     * 객관식 정답은 보기 번호(1부터), 단답형은 허용 답 목록.
     */
    private void seedLevelTest() {
        UUID testId = dsl.insertInto(TESTS)
                .set(TESTS.KIND, TestKind.level)
                .set(TESTS.TITLE, "중등 영어 레벨테스트 (임시)")
                .set(TESTS.TIME_LIMIT_MINUTES, 30)
                .returning(TESTS.ID).fetchOne(TESTS.ID);
        String passage1 = "Minji gets up at seven every morning. She has breakfast with her family and walks to school. "
                + "After school, she goes to the library and reads books about animals. She wants to be a vet in the future.";
        String passage2 = "Last weekend, Junho visited his grandparents in Busan. It rained all day on Saturday, so they stayed home "
                + "and made dumplings together. On Sunday, the weather was sunny, and they went to the beach.";
        Object[][] items = {
                // 코드, 유형, 영역, 문제, 지문, 보기(객관식), 정답
                {"LT-V01", "choice", "어휘", "다음 중 'library'의 뜻으로 알맞은 것은?", null, new String[] {"병원", "도서관", "박물관", "우체국"}, 2},
                {"LT-V02", "choice", "어휘", "다음 중 반대말끼리 짝지어진 것이 아닌 것은?", null, new String[] {"hot - cold", "tall - short", "happy - glad", "early - late"}, 3},
                {"LT-V03", "choice", "어휘", "빈칸에 알맞은 단어는? I brush my ____ after meals.", null, new String[] {"teeth", "hands", "hair", "shoes"}, 1},
                {"LT-V04", "choice", "어휘", "'매일'을 뜻하는 표현은?", null, new String[] {"every day", "some day", "one day", "all the day"}, 1},
                {"LT-V05", "choice", "어휘", "다음 중 직업을 나타내는 단어가 아닌 것은?", null, new String[] {"vet", "pilot", "nurse", "bridge"}, 4},
                {"LT-V06", "short", "어휘", "다음 뜻에 맞는 영어 단어를 쓰시오. (날씨) 맑은, 화창한", null, null, new String[] {"sunny"}},
                {"LT-G01", "choice", "문법", "빈칸에 알맞은 것은? She ____ to school every day.", null, new String[] {"go", "goes", "going", "gone"}, 2},
                {"LT-G02", "choice", "문법", "빈칸에 알맞은 것은? They ____ soccer yesterday.", null, new String[] {"play", "plays", "played", "playing"}, 3},
                {"LT-G03", "choice", "문법", "다음 중 어법상 올바른 문장은?", null, new String[] {"He don't like milk.", "Do she have a pen?", "I am not hungry.", "They is my friends."}, 3},
                {"LT-G04", "choice", "문법", "빈칸에 알맞은 것은? I have lived here ____ 2020.", null, new String[] {"for", "since", "at", "during"}, 2},
                {"LT-G05", "choice", "문법", "빈칸에 알맞은 것은? This box is ____ than that one.", null, new String[] {"heavy", "heavier", "heaviest", "more heavy"}, 2},
                {"LT-G06", "choice", "문법", "빈칸에 알맞은 것은? I want ____ a doctor.", null, new String[] {"be", "being", "to be", "been"}, 3},
                {"LT-G07", "short", "문법", "괄호 안의 동사를 알맞은 형태로 쓰시오. Yesterday I (eat) pizza for lunch.", null, null, new String[] {"ate"}},
                {"LT-G08", "short", "문법", "다음 문장을 부정문으로 바꿀 때 빈칸에 알맞은 말을 쓰시오. He likes cats. → He ____ like cats.", null, null, new String[] {"doesn't", "does not"}},
                {"LT-R01", "choice", "독해", "Minji는 방과 후에 어디에 가는가?", passage1, new String[] {"집", "도서관", "공원", "학원"}, 2},
                {"LT-R02", "choice", "독해", "Minji의 장래 희망은?", passage1, new String[] {"선생님", "작가", "수의사", "요리사"}, 3},
                {"LT-R03", "choice", "독해", "글의 내용과 일치하지 않는 것은?", passage1, new String[] {"7시에 일어난다.", "가족과 아침을 먹는다.", "버스를 타고 학교에 간다.", "동물에 관한 책을 읽는다."}, 3},
                {"LT-R04", "choice", "독해", "토요일에 Junho가 한 일은?", passage2, new String[] {"해변에 갔다.", "만두를 만들었다.", "부산에 갔다 왔다.", "집을 청소했다."}, 2},
                {"LT-R05", "choice", "독해", "일요일 날씨는 어땠는가?", passage2, new String[] {"비가 왔다.", "눈이 왔다.", "맑았다.", "흐렸다."}, 3},
                {"LT-R06", "short", "독해", "Junho가 방문한 사람은 누구인가? 빈칸에 알맞은 영어 한 단어를 쓰시오. (his ____)", passage2, null, new String[] {"grandparents"}},
        };
        for (int i = 0; i < items.length; i++) {
            Object[] it = items[i];
            boolean choice = it[1].equals("choice");
            var content = new LinkedHashMap<String, Object>();
            content.put("stem", it[3]);
            if (it[4] != null) content.put("passage", it[4]);
            if (choice) content.put("choices", it[5]);
            Object answer = choice ? Map.of("choice", it[6]) : Map.of("accepted", it[6]);
            UUID itemId = dsl.insertInto(ITEMS)
                    .set(ITEMS.ITEM_CODE, (String) it[0])
                    .set(ITEMS.TYPE, choice ? ItemType.choice : ItemType.short_)
                    .set(ITEMS.AREA, (String) it[2])
                    .set(ITEMS.CONTENT, JSONB.valueOf(toJson(content)))
                    .set(ITEMS.ANSWER, JSONB.valueOf(toJson(answer)))
                    .set(ITEMS.POINTS, BigDecimal.valueOf(5))
                    .returning(ITEMS.ID).fetchOne(ITEMS.ID);
            dsl.insertInto(TEST_ITEMS).set(TEST_ITEMS.TEST_ID, testId).set(TEST_ITEMS.SEQ, i + 1).set(TEST_ITEMS.ITEM_ID, itemId).execute();
        }
        log.info("개발용 임시 레벨테스트 생성 ({}문항, 문항당 5점)", items.length);
    }

    private static String toJson(Object value) {
        try {
            return JSON.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    private void seedCurriculum() {
        Map<String, String[]> topics = Map.of(
                "M1", new String[] {"be동사와 일반동사", "현재·과거 시제", "의문문과 부정문", "명사와 관사", "대명사", "형용사와 부사", "조동사 can·will", "1~7회 복습 테스트"},
                "M2", new String[] {"현재완료", "to부정사", "동명사", "수동태", "비교급·최상급", "관계대명사", "접속사", "1~7회 복습 테스트"},
                "M3", new String[] {"관계부사", "분사·분사구문", "가정법 과거", "간접의문문", "명사절", "강조·도치", "서술형 쓰기", "고등 대비 종합 테스트"});
        topics.forEach((level, titles) -> {
            for (int i = 0; i < titles.length; i++) {
                dsl.insertInto(CURRICULUM_ITEMS)
                        .set(CURRICULUM_ITEMS.LEVEL, level)
                        .set(CURRICULUM_ITEMS.SEQ, i + 1)
                        .set(CURRICULUM_ITEMS.TITLE, titles[i])
                        .set(CURRICULUM_ITEMS.DESCRIPTION, i == titles.length - 1 ? "회차 학습 내용을 점검하는 테스트" : "개념 설명 → 문제 풀이 → 오답 정리")
                        .execute();
            }
        });
        log.info("개발용 샘플 커리큘럼 생성 (M1~M3, 각 8회차)");
    }

    private void seedBase() {
        String hash = encoder.encode(DEV_PASSWORD);

        profile("owner", "정하늘", UserRole.owner, hash);
        profile("counselor", "김상담", UserRole.counselor, hash);
        UUID t1 = profile("teacher", "이강사", UserRole.teacher, hash);
        UUID t2 = profile("teacher2", "박영어", UserRole.teacher, hash);
        UUID t3 = profile("teacher3", "최문법", UserRole.teacher, hash);

        // 반: 학년별 A(월·수·금) / B(화·목), 담당 강사
        Map<String, List<UUID>> classesByGrade = new HashMap<>();
        int[][] slots = {{1, 3, 5}, {2, 4}};
        UUID[][] teachers = {{t1, t2}, {t1, t3}, {t2, t3}};
        String[] startTimes = {"16:00", "17:40", "19:20"};
        for (int g = 1; g <= 3; g++) {
            for (int s = 0; s < 2; s++) {
                String name = "중" + g + (s == 0 ? "A" : "B");
                UUID classId = dsl.insertInto(CLASSES)
                        .set(CLASSES.NAME, name)
                        .set(CLASSES.LEVEL, "M" + g)
                        .set(CLASSES.TEACHER_ID, teachers[g - 1][s])
                        .set(CLASSES.CAPACITY, 30)
                        .returning(CLASSES.ID).fetchOne(CLASSES.ID);
                LocalTime start = LocalTime.parse(startTimes[g - 1]);
                for (int weekday : slots[s]) {
                    dsl.insertInto(CLASS_SCHEDULES)
                            .set(CLASS_SCHEDULES.CLASS_ID, classId)
                            .set(CLASS_SCHEDULES.WEEKDAY, (short) weekday)
                            .set(CLASS_SCHEDULES.START_TIME, start)
                            .set(CLASS_SCHEDULES.END_TIME, start.plusMinutes(90))
                            .execute();
                }
                classesByGrade.computeIfAbsent("중" + g, k -> new ArrayList<>()).add(classId);
            }
        }

        // 학생: 순서대로 넣어 학생 코드가 S-0001 부터 붙는다
        Random random = new Random(20261119L);
        LocalDate enrolledFrom = LocalDate.of(2026, 9, 1);
        for (int i = 0; i < studentCount; i++) {
            String name = i == 0 ? "박학생" : SURNAMES[random.nextInt(SURNAMES.length)] + GIVEN[random.nextInt(GIVEN.length)];
            String grade = "중" + (1 + random.nextInt(3));
            StudentStatus status = i == 0 ? StudentStatus.enrolled : pickStatus(random.nextInt(100));
            var student = dsl.insertInto(STUDENTS)
                    .set(STUDENTS.NAME, name)
                    .set(STUDENTS.SCHOOL, SCHOOLS[random.nextInt(SCHOOLS.length)])
                    .set(STUDENTS.GRADE, grade)
                    .set(STUDENTS.PARENT_NAME, name.charAt(0) + "보호자")
                    .set(STUDENTS.PARENT_PHONE, String.format("010-%04d-%04d", 1000 + random.nextInt(9000), random.nextInt(10000)))
                    .set(STUDENTS.STATUS, status)
                    .returning(STUDENTS.ID, STUDENTS.STUDENT_CODE).fetchOne();

            if (status == StudentStatus.enrolled || status == StudentStatus.paused) {
                List<UUID> classes = classesByGrade.get(grade);
                dsl.insertInto(ENROLLMENTS)
                        .set(ENROLLMENTS.STUDENT_ID, student.getId())
                        .set(ENROLLMENTS.CLASS_ID, classes.get(random.nextInt(classes.size())))
                        .set(ENROLLMENTS.START_DATE, enrolledFrom.plusDays(random.nextInt(60)))
                        .execute();
            }
            if (i == 0) {
                // 학생 로그인 계정: 학생 코드 S-0001 / 1234
                UUID profileId = profile(student.getStudentCode(), name, UserRole.student, hash);
                dsl.update(STUDENTS).set(STUDENTS.PROFILE_ID, profileId).where(STUDENTS.ID.eq(student.getId())).execute();
            }
        }
        log.info("개발용 샘플 데이터 생성: 계정 6개, 반 6개, 학생 {}명 (비밀번호 {})", studentCount, DEV_PASSWORD);
    }

    private void seedInquiries() {
        UUID counselorId = dsl.select(PROFILES.ID).from(PROFILES).where(PROFILES.LOGIN_ID.eq("counselor")).fetchOne(PROFILES.ID);
        Random random = new Random(1119L);
        InquiryStatus[] statuses = {InquiryStatus.received, InquiryStatus.received, InquiryStatus.received,
                InquiryStatus.contacted, InquiryStatus.contacted, InquiryStatus.scheduled, InquiryStatus.completed,
                InquiryStatus.canceled};
        String[] times = {"14:00", "15:30", "16:00", "17:00", "18:30", "19:00"};
        String[] messages = {null, "중2 문법이 약해서 상담 받고 싶어요.", "레벨테스트 후 반 배정 가능할까요?",
                "주말 상담 가능한지 궁금합니다.", null, "형제가 같이 다닐 수 있나요?"};
        OffsetDateTime now = OffsetDateTime.now();
        for (int i = 0; i < 30; i++) {
            String student = SURNAMES[random.nextInt(SURNAMES.length)] + GIVEN[random.nextInt(GIVEN.length)];
            OffsetDateTime created = now.minusHours(random.nextInt(14 * 24)).withMinute(random.nextInt(60));
            LocalDate base = created.toLocalDate().plusDays(2);
            String slots = "[" + String.format("{\"date\":\"%s\",\"time\":\"%s\"}", base, times[random.nextInt(times.length)])
                    + (random.nextBoolean() ? String.format(",{\"date\":\"%s\",\"time\":\"%s\"}", base.plusDays(1), times[random.nextInt(times.length)]) : "")
                    + "]";
            InquiryStatus status = statuses[random.nextInt(statuses.length)];
            UUID id = dsl.insertInto(INQUIRIES)
                    .set(INQUIRIES.TYPE, random.nextInt(3) == 0 ? InquiryType.consult : InquiryType.level_test)
                    .set(INQUIRIES.STATUS, status)
                    .set(INQUIRIES.APPLICANT_NAME, student.charAt(0) + "보호자")
                    .set(INQUIRIES.APPLICANT_PHONE, String.format("010-%04d-%04d", 1000 + random.nextInt(9000), random.nextInt(10000)))
                    .set(INQUIRIES.STUDENT_NAME, student)
                    .set(INQUIRIES.SCHOOL, SCHOOLS[random.nextInt(SCHOOLS.length)])
                    .set(INQUIRIES.GRADE, "중" + (1 + random.nextInt(3)))
                    .set(INQUIRIES.PREFERRED_SLOTS, JSONB.valueOf(slots))
                    .set(INQUIRIES.MESSAGE, messages[random.nextInt(messages.length)])
                    .set(INQUIRIES.PRIVACY_AGREED, true)
                    .set(INQUIRIES.CREATED_AT, created)
                    .set(INQUIRIES.UPDATED_AT, created)
                    .returning(INQUIRIES.ID).fetchOne(INQUIRIES.ID);
            if (status != InquiryStatus.received && counselorId != null) {
                dsl.insertInto(CONSULT_NOTES)
                        .set(CONSULT_NOTES.INQUIRY_ID, id)
                        .set(CONSULT_NOTES.AUTHOR_ID, counselorId)
                        .set(CONSULT_NOTES.CONTENT, "학부모 통화. 희망 일정 확인함.")
                        .set(CONSULT_NOTES.CREATED_AT, created.plusHours(3))
                        .execute();
            }
        }
        log.info("개발용 샘플 접수 30건 생성");
    }

    /** 재원 75%, 상담중 8%, 테스트예정 7%, 휴원 5%, 퇴원 5% */
    private static StudentStatus pickStatus(int n) {
        if (n < 75) return StudentStatus.enrolled;
        if (n < 83) return StudentStatus.consulting;
        if (n < 90) return StudentStatus.test_scheduled;
        if (n < 95) return StudentStatus.paused;
        return StudentStatus.withdrawn;
    }

    private UUID profile(String loginId, String name, UserRole role, String hash) {
        return dsl.insertInto(PROFILES)
                .set(PROFILES.LOGIN_ID, loginId)
                .set(PROFILES.PASSWORD_HASH, hash)
                .set(PROFILES.ROLE, role)
                .set(PROFILES.NAME, name)
                .returning(PROFILES.ID).fetchOne(PROFILES.ID);
    }
}
