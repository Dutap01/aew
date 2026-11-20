import type { StudentDetail, StudentPage, StudentStatus, StudentUpsertRequest } from '@/types/student'
import { api, toQuery } from './client'

export interface StudentSearchParams {
  q?: string // 이름·학생 코드·학교·학부모 연락처
  status?: StudentStatus
  page?: number // 0부터
  size?: number
}

export const searchStudents = (params: StudentSearchParams) =>
  api.get<StudentPage>(`/admin/students${toQuery({ ...params })}`)

export const getStudent = (id: string) => api.get<StudentDetail>(`/admin/students/${id}`)

export const createStudent = (req: StudentUpsertRequest) => api.post<StudentDetail>('/admin/students', req)

export const updateStudent = (id: string, req: StudentUpsertRequest) => api.put<StudentDetail>(`/admin/students/${id}`, req)

export const addStudentNote = (id: string, content: string) =>
  api.post<StudentDetail>(`/admin/students/${id}/notes`, { content })

/** 반에 넣기 (대표). startDate 가 없으면 오늘 */
export const enrollStudent = (id: string, classId: string, startDate: string | null) =>
  api.post<StudentDetail>(`/admin/students/${id}/enrollments`, { classId, startDate })

/** 반 소속 종료 (대표). endDate 가 없으면 오늘 */
export const endEnrollment = (id: string, enrollmentId: string, endDate: string | null) =>
  api.put<StudentDetail>(`/admin/students/${id}/enrollments/${enrollmentId}/end`, { endDate })
