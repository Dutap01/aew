import type { AppointmentStatus } from '@/types/appointment'
import { cn } from '@/utils/cn'

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled: '예약',
  done: '완료',
  canceled: '취소',
  no_show: '불참',
}

const TONE: Record<AppointmentStatus, string> = {
  scheduled: 'bg-sky-soft text-navy',
  done: 'bg-brand-50 text-brand-800',
  canceled: 'bg-track text-muted',
  no_show: 'bg-alert/10 text-alert',
}

export function AppointmentStatusBadge({ status, className }: { status: AppointmentStatus; className?: string }) {
  return (
    <span className={cn('inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold whitespace-nowrap', TONE[status], className)}>
      {APPOINTMENT_STATUS_LABEL[status]}
    </span>
  )
}
