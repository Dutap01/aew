import type { InquiryStatus, InquiryType } from '@/types/inquiry'
import { cn } from '@/utils/cn'

export const INQUIRY_STATUS_LABEL: Record<InquiryStatus, string> = {
  received: '접수',
  contacted: '연락완료',
  scheduled: '예약확정',
  completed: '완료',
  canceled: '취소',
}

export const INQUIRY_TYPE_LABEL: Record<InquiryType, string> = {
  consult: '상담',
  level_test: '레벨테스트',
}

const STATUS_TONE: Record<InquiryStatus, string> = {
  received: 'bg-alert/10 text-alert',
  contacted: 'bg-wait/15 text-[#a16207]',
  scheduled: 'bg-sky-soft text-navy',
  completed: 'bg-brand-50 text-brand-800',
  canceled: 'bg-track text-muted',
}

const BADGE = 'inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold whitespace-nowrap'

export function InquiryStatusBadge({ status, className }: { status: InquiryStatus; className?: string }) {
  return <span className={cn(BADGE, STATUS_TONE[status], className)}>{INQUIRY_STATUS_LABEL[status]}</span>
}

export function InquiryTypeBadge({ type, className }: { type: InquiryType; className?: string }) {
  return (
    <span className={cn(BADGE, type === 'level_test' ? 'bg-grape-50 text-grape' : 'bg-brand-50 text-brand-800', className)}>
      {INQUIRY_TYPE_LABEL[type]}
    </span>
  )
}
