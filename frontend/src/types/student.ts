import type { components } from '@/api/schema'

export type StudentSummary = components['schemas']['StudentSummary']
export type StudentStatus = StudentSummary['status']
export type StudentPage = components['schemas']['PageResponseStudentSummary']
