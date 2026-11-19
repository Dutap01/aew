// 대시보드 도메인 타입 — 백엔드 API 응답 스키마와 1:1로 맞춘다.

export type TrendPeriod = 'day' | 'week' | 'month' | 'all'

export interface TrendPoint {
  label: string
  consultations: number // 신규 상담
  levelTests: number // 레벨테스트
}

export type TrendSeries = Record<TrendPeriod, TrendPoint[]>

export interface GradeSlice {
  grade: '중1' | '중2' | '중3'
  students: number
}

export interface ClassComposition {
  slices: GradeSlice[]
  totalStudents: number
  newThisMonth: number
}

export type ReportStatus = 'pending' | 'reviewing' | 'done'

export interface DiagnosisReport {
  id: string
  studentName: string
  school: string
  grade: string
  status: ReportStatus
  completedItems: number
  totalItems: number
  updatedAt: string // ISO date
}

export interface EnrollmentPoint {
  month: string
  students: number
}

export interface EnrollmentSummary {
  totalStudents: number
  newThisMonth: number
  conversionRate: number // %
  conversionDelta: number // 전월 대비 %p
  history: EnrollmentPoint[]
}

export interface ClassRow {
  id: string
  name: string
  teacher: string
  students: number
  homeworkRate: number // %
  averageScore: number
}

export type TaskTone = 'blue' | 'green'
export type TaskDue = 'today' | 'tomorrow' | 'week'

export interface TodayTask {
  id: string
  title: string
  meta: string
  due: TaskDue
  tone: TaskTone
  done: boolean
}

export interface TeacherStat {
  id: string
  name: string
  subject: string
  processRate: number // %
}

export interface HomeworkDay {
  day: string // 월~일
  submitted: number
  isToday: boolean
}

export interface DashboardData {
  trend: TrendSeries
  composition: ClassComposition
  reports: DiagnosisReport[]
  enrollment: EnrollmentSummary
  classes: ClassRow[]
  tasks: TodayTask[]
  teachers: TeacherStat[]
  homework: HomeworkDay[]
}

/** 사이드바/상단바 공통 요약 */
export interface ShellSummary {
  academyName: string
  badges: Partial<Record<string, number>> // 메뉴 key → 미처리 건수
  monthlyHomeworkRate: number
}
