import type { NotificationCounts, NotificationPage, NotificationStatus } from '@/types/notification'
import { api, toQuery } from './client'

export const searchNotifications = (params: { q?: string; status?: NotificationStatus; page?: number; size?: number }) =>
  api.get<NotificationPage>(`/admin/notifications${toQuery({ ...params })}`)

export const getNotificationCounts = (q?: string) => api.get<NotificationCounts>(`/admin/notifications/counts${toQuery({ q })}`)

/** 실패 → 다시 대기열, 성공 → 같은 내용으로 한 번 더 */
export const resendNotification = (id: string) => api.post<void>(`/admin/notifications/${id}/resend`)
