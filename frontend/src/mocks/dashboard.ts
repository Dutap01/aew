// 대시보드 mock 데이터. 백엔드 연결 후에는 api/dashboard.ts 에서 더 이상 import 하지 않는다.
import type {
  ClassComposition,
  ClassRow,
  DiagnosisReport,
  EnrollmentSummary,
  HomeworkDay,
  ShellSummary,
  TeacherStat,
  TodayTask,
  TrendSeries,
} from '@/types/dashboard'

export const shellSummary: ShellSummary = {
  academyName: '한빛 중등영어학원',
  badges: { inquiries: 3, levelTests: 2, reports: 4, feedbacks: 6, messages: 2 }, // 메뉴 key(navigation.ts badgeKey) → 처리 대기 건수
  monthlyHomeworkRate: 68,
}

export const trend: TrendSeries = {
  day: [
    { label: '11/10', consultations: 4, levelTests: 2 },
    { label: '11/11', consultations: 6, levelTests: 3 },
    { label: '11/12', consultations: 3, levelTests: 4 },
    { label: '11/13', consultations: 7, levelTests: 3 },
    { label: '11/14', consultations: 5, levelTests: 5 },
    { label: '11/15', consultations: 9, levelTests: 6 },
    { label: '11/16', consultations: 6, levelTests: 4 },
  ],
  week: [
    { label: '9월 4주', consultations: 18, levelTests: 9 },
    { label: '10월 1주', consultations: 22, levelTests: 12 },
    { label: '10월 2주', consultations: 19, levelTests: 14 },
    { label: '10월 3주', consultations: 27, levelTests: 15 },
    { label: '10월 4주', consultations: 24, levelTests: 18 },
    { label: '11월 1주', consultations: 31, levelTests: 17 },
    { label: '11월 2주', consultations: 29, levelTests: 21 },
    { label: '11월 3주', consultations: 34, levelTests: 22 },
  ],
  month: [
    { label: '6월', consultations: 62, levelTests: 31 },
    { label: '7월', consultations: 88, levelTests: 47 },
    { label: '8월', consultations: 104, levelTests: 58 },
    { label: '9월', consultations: 79, levelTests: 44 },
    { label: '10월', consultations: 92, levelTests: 56 },
    { label: '11월', consultations: 71, levelTests: 40 },
  ],
  all: [
    { label: '2024', consultations: 612, levelTests: 288 },
    { label: '2025 상', consultations: 398, levelTests: 201 },
    { label: '2025 하', consultations: 455, levelTests: 239 },
    { label: '2026 상', consultations: 471, levelTests: 252 },
    { label: '2026 하', consultations: 434, levelTests: 245 },
  ],
}

export const composition: ClassComposition = {
  slices: [
    { grade: '중1', students: 38 },
    { grade: '중2', students: 51 },
    { grade: '중3', students: 39 },
  ],
  totalStudents: 128,
  newThisMonth: 12,
}

export const reports: DiagnosisReport[] = [
  {
    id: 'rp-1031',
    studentName: '이서연',
    school: '한빛중',
    grade: '2학년',
    status: 'reviewing',
    completedItems: 3,
    totalItems: 5,
    updatedAt: '2026-11-16',
  },
  {
    id: 'rp-1030',
    studentName: '박도윤',
    school: '새솔중',
    grade: '1학년',
    status: 'pending',
    completedItems: 1,
    totalItems: 5,
    updatedAt: '2026-11-15',
  },
  {
    id: 'rp-1029',
    studentName: '최하은',
    school: '한빛중',
    grade: '3학년',
    status: 'done',
    completedItems: 5,
    totalItems: 5,
    updatedAt: '2026-11-14',
  },
]

export const enrollment: EnrollmentSummary = {
  totalStudents: 128,
  newThisMonth: 12,
  conversionRate: 42.5,
  conversionDelta: 3.8,
  history: [
    { month: '6월', students: 104 },
    { month: '7월', students: 109 },
    { month: '8월', students: 118 },
    { month: '9월', students: 115 },
    { month: '10월', students: 121 },
    { month: '11월', students: 128 },
  ],
}

export const classes: ClassRow[] = [
  { id: 'c-2a', name: '중2A', teacher: '김지현', students: 14, homeworkRate: 86, averageScore: 88.4 },
  { id: 'c-3a', name: '중3A', teacher: '오태민', students: 12, homeworkRate: 79, averageScore: 85.1 },
  { id: 'c-1a', name: '중1A', teacher: '윤수아', students: 13, homeworkRate: 74, averageScore: 82.7 },
  { id: 'c-2b', name: '중2B', teacher: '김지현', students: 15, homeworkRate: 61, averageScore: 79.3 },
  { id: 'c-3b', name: '중3B', teacher: '한결', students: 11, homeworkRate: 58, averageScore: 81.0 },
  { id: 'c-1b', name: '중1B', teacher: '윤수아', students: 12, homeworkRate: 52, averageScore: 76.5 },
]

export const tasks: TodayTask[] = [
  { id: 't1', title: '김민준 학부모 상담 콜백', meta: '신규 상담 · 오후 4시', due: 'today', tone: 'blue', done: false },
  { id: 't2', title: '중2A 숙제 미채점 7건', meta: 'Unit 6 독해 워크북', due: 'today', tone: 'green', done: false },
  { id: 't3', title: '이서연 진단서 발송', meta: '검토 완료 후 학부모 앱 발송', due: 'today', tone: 'blue', done: false },
  { id: 't4', title: '레벨테스트 2건 결과 입력', meta: '박도윤 · 정예린', due: 'tomorrow', tone: 'green', done: true },
]

export const teachers: TeacherStat[] = [
  { id: 'tc1', name: '김지현', subject: '중2 독해', processRate: 92 },
  { id: 'tc2', name: '오태민', subject: '중3 문법', processRate: 84 },
  { id: 'tc3', name: '윤수아', subject: '중1 어휘', processRate: 77 },
  { id: 'tc4', name: '한결', subject: '중3 듣기', processRate: 65 },
]

const DAYS = ['월', '화', '수', '목', '금', '토', '일'] as const
const SUBMITTED = [42, 51, 38, 47, 55, 29, 18]

/** 오늘 요일을 기준으로 isToday 를 계산 (월요일=0) */
export function buildHomeworkWeek(now = new Date()): HomeworkDay[] {
  const todayIndex = (now.getDay() + 6) % 7
  return DAYS.map((day, i) => ({ day, submitted: SUBMITTED[i], isToday: i === todayIndex }))
}
