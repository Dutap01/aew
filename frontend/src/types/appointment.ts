import type { components } from '@/api/schema'

type S = components['schemas']

export type Appointment = S['AppointmentResponse']
export type AppointmentStatus = Appointment['status']
export type AppointmentCreateRequest = S['AppointmentCreateRequest']
export type AppointmentUpdateRequest = S['AppointmentUpdateRequest']
export type StaffOption = S['StaffOption']
