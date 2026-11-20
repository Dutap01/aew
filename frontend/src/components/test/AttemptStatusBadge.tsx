import type { AttemptStatus } from '@/types/test'
import { cn } from '@/utils/cn'

export const ATTEMPT_STATUS_LABEL: Record<AttemptStatus, string> = {
  issued: '발급',
  in_progress: '응시중',
  submitted: '채점대기',
  graded: '채점완료',
}

const TONE: Record<AttemptStatus, string> = {
  issued: 'bg-track text-ink',
  in_progress: 'bg-sky-soft text-navy',
  submitted: 'bg-wait/15 text-[#a16207]',
  graded: 'bg-brand-50 text-brand-800',
}

export function AttemptStatusBadge({ status, className }: { status: AttemptStatus; className?: string }) {
  return (
    <span className={cn('inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold whitespace-nowrap', TONE[status], className)}>
      {ATTEMPT_STATUS_LABEL[status]}
    </span>
  )
}

/** 13 / 100 → "13 / 100점" (소수점 없는 점수는 정수로) */
export function formatScore(score: number | null | undefined, max: number | null | undefined): string {
  if (score === null || score === undefined) return '-'
  const n = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))
  return max ? `${n(score)} / ${n(max)}점` : `${n(score)}점`
}
