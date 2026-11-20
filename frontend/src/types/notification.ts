import type { components } from '@/api/schema'

export type Notification = components['schemas']['NotificationResponse']
export type NotificationStatus = Notification['status']
export type NotificationCounts = components['schemas']['NotificationCounts']
export type NotificationPage = components['schemas']['PageResponseNotificationResponse']
