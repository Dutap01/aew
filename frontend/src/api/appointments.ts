import type { Appointment, AppointmentCreateRequest, AppointmentStatus, AppointmentUpdateRequest, StaffOption } from '@/types/appointment'
import { api, toQuery } from './client'

/** [from, to) 와 겹치는 일정 (ISO 시각, 최대 62일) */
export const getAppointments = (from: string, to: string, counselorId?: string) =>
  api.get<Appointment[]>(`/admin/appointments${toQuery({ from, to, counselorId })}`)

export const getCounselors = () => api.get<StaffOption[]>('/admin/appointments/counselors')

export const createAppointment = (req: AppointmentCreateRequest) => api.post<Appointment>('/admin/appointments', req)

export const updateAppointment = (id: string, req: AppointmentUpdateRequest) => api.put<Appointment>(`/admin/appointments/${id}`, req)

export const changeAppointmentStatus = (id: string, status: AppointmentStatus) =>
  api.put<Appointment>(`/admin/appointments/${id}/status`, { status })
