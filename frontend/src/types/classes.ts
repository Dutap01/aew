import type { components } from '@/api/schema'

type S = components['schemas']

export type ClassSummary = S['ClassSummary']
export type ClassDetail = S['ClassDetail']
export type ClassStudent = S['ClassStudent']
/** weekday: ISO 1=월 … 7=일, 시각은 "16:00" */
export type ClassScheduleSlot = S['ClassScheduleSlot']
export type ClassUpsertRequest = S['ClassUpsertRequest']
