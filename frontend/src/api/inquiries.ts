import type {
  InquiryCounts,
  InquiryCreateRequest,
  InquiryDetail,
  InquiryPage,
  InquiryStatus,
  InquiryType,
} from '@/types/inquiry'
import { api, toQuery } from './client'

export interface InquirySearchParams {
  q?: string
  status?: InquiryStatus
  type?: InquiryType
  page?: number
  size?: number
}

/** 공개 신청서 (로그인 없음) */
export const submitInquiry = (req: InquiryCreateRequest) => api.post<{ id: string }>('/public/inquiries', req)

export const searchInquiries = (params: InquirySearchParams) =>
  api.get<InquiryPage>(`/admin/inquiries${toQuery({ ...params })}`)

export const getInquiryCounts = (params: Pick<InquirySearchParams, 'q' | 'type'>) =>
  api.get<InquiryCounts>(`/admin/inquiries/counts${toQuery({ ...params })}`)

export const getInquiry = (id: string) => api.get<InquiryDetail>(`/admin/inquiries/${id}`)

export const changeInquiryStatus = (id: string, status: InquiryStatus) =>
  api.put<InquiryDetail>(`/admin/inquiries/${id}/status`, { status })

export const addInquiryNote = (id: string, content: string) =>
  api.post<InquiryDetail>(`/admin/inquiries/${id}/notes`, { content })

/** existingStudentId 가 없으면 신청 내용으로 새 학생 등록 */
export const linkInquiryStudent = (id: string, existingStudentId: string | null) =>
  api.post<InquiryDetail>(`/admin/inquiries/${id}/student`, { existingStudentId })
