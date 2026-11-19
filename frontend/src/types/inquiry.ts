import type { components } from '@/api/schema'

type S = components['schemas']

export type InquiryType = S['InquirySummary']['type']
export type InquiryStatus = S['InquirySummary']['status']
export type PreferredSlot = S['PreferredSlot']
export type InquirySummary = S['InquirySummary']
export type InquiryPage = S['PageResponseInquirySummary']
export type InquiryCounts = S['InquiryCounts']
export type InquiryCreateRequest = S['InquiryCreateRequest']
export type LinkedStudent = S['LinkedStudent']
export type InquiryNote = S['InquiryNote']

/** student 는 학생 연결 전이면 null (OpenAPI 에서 중첩 객체의 null 표시가 빠져 여기서 보정) */
export type InquiryDetail = Omit<S['InquiryDetail'], 'student'> & { student: LinkedStudent | null }
