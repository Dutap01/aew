import type { components } from '@/api/schema'

type S = components['schemas']

export type StudentSummary = S['StudentSummary']
export type StudentStatus = StudentSummary['status']
export type StudentPage = S['PageResponseStudentSummary']
export type StudentDetail = S['StudentDetail']
export type StudentEnrollment = S['Enrollment']
export type TimelineEvent = S['TimelineEvent']
export type TimelineKind = TimelineEvent['kind']
export type StudentUpsertRequest = S['StudentUpsertRequest']
export type StudentCredentials = S['StudentCredentials']
