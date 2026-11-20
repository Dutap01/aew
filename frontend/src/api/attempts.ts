import type {
  AttemptCounts, AttemptDetail, AttemptIssuedResponse, AttemptPage, AttemptStatus, AttemptSummary, LevelTestSettings, StudentAttempt,
  TestAccountInfo, TestOption,
} from '@/types/test'
import { api, toQuery } from './client'

// ---- 운영자 (대표·상담실장)
export const getLevelTests = () => api.get<TestOption[]>('/admin/tests/level')

export const searchAttempts = (params: { q?: string; status?: AttemptStatus; page?: number; size?: number }) =>
  api.get<AttemptPage>(`/admin/attempts${toQuery({ ...params })}`)

export const getAttemptCounts = (q?: string) => api.get<AttemptCounts>(`/admin/attempts/counts${toQuery({ q })}`)

export const getAttempt = (id: string) => api.get<AttemptDetail>(`/admin/attempts/${id}`)

export const getStudentAttempts = (studentId: string) => api.get<AttemptSummary[]>(`/admin/students/${studentId}/attempts`)

export const issueAttempt = (req: { studentId: string; testId: string; inquiryId?: string | null }) =>
  api.post<AttemptIssuedResponse>('/admin/attempts', req)

/** 레벨테스트 계정 다시 발급 (같은 아이디, 새 비밀번호, 사용 시간 다시) */
export const reissueTestAccount = (id: string) => api.post<AttemptIssuedResponse>(`/admin/attempts/${id}/account`)

export const getLevelTestSettings = () => api.get<LevelTestSettings>('/admin/settings/level-test')

export const updateLevelTestSettings = (req: LevelTestSettings) => api.put<LevelTestSettings>('/admin/settings/level-test', req)

/** 지금 쓸 수 있는 레벨테스트 계정 */
export const getActiveTestAccounts = () => api.get<TestAccountInfo[]>('/admin/settings/level-test/accounts')

export const cancelAttempt = (id: string) => api.delete<void>(`/admin/attempts/${id}`)

export const forceSubmitAttempt = (id: string) => api.post<AttemptDetail>(`/admin/attempts/${id}/submit`)

export const scoreEssay = (id: string, itemId: string, score: number) =>
  api.put<AttemptDetail>(`/admin/attempts/${id}/items/${itemId}/score`, { score })

// ---- 학생 본인
export const getMyAttempts = () => api.get<StudentAttempt[]>('/s/attempts')

export const getMyAttempt = (id: string) => api.get<StudentAttempt>(`/s/attempts/${id}`)

export const startMyAttempt = (id: string) => api.post<StudentAttempt>(`/s/attempts/${id}/start`)

/** 답 하나 저장. 객관식은 choice(1부터), 나머지는 text. 둘 다 null 이면 답 지우기 */
export const saveAnswer = (id: string, itemId: string, answer: { choice?: number | null; text?: string | null }) =>
  api.put<void>(`/s/attempts/${id}/answers`, { itemId, ...answer })

export const submitMyAttempt = (id: string) => api.post<StudentAttempt>(`/s/attempts/${id}/submit`)
