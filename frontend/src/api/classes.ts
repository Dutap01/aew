import type { StaffOption } from '@/types/appointment'
import type { ClassDetail, ClassSummary, ClassUpsertRequest } from '@/types/classes'
import { api, toQuery } from './client'

/** all=true 면 운영 종료한 반도 */
export const getClasses = (all = false) => api.get<ClassSummary[]>(`/admin/classes${toQuery({ all: all ? 'true' : undefined })}`)

export const getClass = (id: string) => api.get<ClassDetail>(`/admin/classes/${id}`)

export const getTeachers = () => api.get<StaffOption[]>('/admin/classes/teachers')

export const getClassLevels = () => api.get<string[]>('/admin/classes/levels')

export const createClass = (req: ClassUpsertRequest) => api.post<ClassDetail>('/admin/classes', req)

export const updateClass = (id: string, req: ClassUpsertRequest) => api.put<ClassDetail>(`/admin/classes/${id}`, req)
