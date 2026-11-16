// 대시보드 API.
// 지금은 mocks 를 Promise 로 감싸 반환한다. 백엔드가 준비되면 각 함수 본문만
// 주석의 api.get(...) 호출로 바꾸면 되고, 호출하는 쪽(페이지/컴포넌트)은 수정할 필요가 없다.
import * as mock from '@/mocks/dashboard'
import type {
  ClassComposition,
  ClassRow,
  DashboardData,
  DiagnosisReport,
  EnrollmentSummary,
  HomeworkDay,
  ShellSummary,
  TeacherStat,
  TodayTask,
  TrendSeries,
} from '@/types/dashboard'
// import { api } from './client'

const MOCK_LATENCY_MS = 120

function resolveMock<T>(data: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), MOCK_LATENCY_MS))
}

export const getShellSummary = (): Promise<ShellSummary> => resolveMock(mock.shellSummary) // api.get('/dashboard/shell')
export const getTrend = (): Promise<TrendSeries> => resolveMock(mock.trend) // api.get('/dashboard/trend')
export const getClassComposition = (): Promise<ClassComposition> => resolveMock(mock.composition) // api.get('/dashboard/composition')
export const getRecentReports = (): Promise<DiagnosisReport[]> => resolveMock(mock.reports) // api.get('/reports?recent=3')
export const getEnrollment = (): Promise<EnrollmentSummary> => resolveMock(mock.enrollment) // api.get('/dashboard/enrollment')
export const getClassStats = (): Promise<ClassRow[]> => resolveMock(mock.classes) // api.get('/classes/stats')
export const getTodayTasks = (): Promise<TodayTask[]> => resolveMock(mock.tasks) // api.get('/tasks/today')
export const getTeacherStats = (): Promise<TeacherStat[]> => resolveMock(mock.teachers) // api.get('/teachers/stats')
export const getHomeworkWeek = (): Promise<HomeworkDay[]> => resolveMock(mock.buildHomeworkWeek()) // api.get('/homework/weekly')

/** 대시보드 홈에 필요한 데이터를 한 번에 불러온다. */
export async function getDashboardData(): Promise<DashboardData> {
  const [trend, composition, reports, enrollment, classes, tasks, teachers, homework] = await Promise.all([
    getTrend(),
    getClassComposition(),
    getRecentReports(),
    getEnrollment(),
    getClassStats(),
    getTodayTasks(),
    getTeacherStats(),
    getHomeworkWeek(),
  ])
  return { trend, composition, reports, enrollment, classes, tasks, teachers, homework }
}
