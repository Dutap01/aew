import type { ClassScheduleSlot } from '@/types/classes'
import { formatTime, weekdayName } from './format'

/** 반 수업 시간 요약: 같은 시간끼리 요일을 묶는다. [월 16:00~17:30, 수 16:00~17:30] → "월·수 16:00~17:30" */
export function formatSchedules(slots: ClassScheduleSlot[]): string {
  if (slots.length === 0) return '수업 시간 없음'
  const groups = new Map<string, number[]>()
  for (const s of slots) {
    const key = `${formatTime(s.startTime)}~${formatTime(s.endTime)}`
    groups.set(key, [...(groups.get(key) ?? []), s.weekday])
  }
  return [...groups.entries()]
    .map(([time, days]) => `${days.sort((a, b) => a - b).map(weekdayName).join('·')} ${time}`)
    .join(', ')
}
