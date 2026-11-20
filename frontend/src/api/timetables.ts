import type { StaffOption } from '@/types/appointment'
import type { Timetable } from '@/types/timetable'
import { api, toQuery } from './client'

// week: 그 주에 있는 아무 날짜 (YYYY-MM-DD). 없으면 이번 주

/** 대표·상담실장: 학생 시간표 */
export const getStudentTimetable = (id: string, week?: string) =>
  api.get<Timetable>(`/admin/timetables/students/${id}${toQuery({ week })}`)

/** 대표·상담실장: 강사 시간표 */
export const getTeacherTimetable = (id: string, week?: string) =>
  api.get<Timetable>(`/admin/timetables/teachers/${id}${toQuery({ week })}`)

export const getTimetableTeachers = () => api.get<StaffOption[]>('/admin/timetables/teachers')

/** 강사 본인 */
export const getMyTeacherTimetable = (week?: string) => api.get<Timetable>(`/t/timetable${toQuery({ week })}`)

/** 학생 본인 */
export const getMyStudentTimetable = (week?: string) => api.get<Timetable>(`/s/timetable${toQuery({ week })}`)
