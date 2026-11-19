import type { StudentPage, StudentStatus } from '@/types/student'
import { api, toQuery } from './client'

export interface StudentSearchParams {
  q?: string // 이름·학생 코드·학교·학부모 연락처
  status?: StudentStatus
  page?: number // 0부터
  size?: number
}

export const searchStudents = (params: StudentSearchParams) =>
  api.get<StudentPage>(`/admin/students${toQuery({ ...params })}`)
