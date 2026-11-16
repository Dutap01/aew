import type { ReportStatus } from '@/types/dashboard'
import { cn } from '@/lib/cn'

const STATUS: Record<ReportStatus, { label: string; className: string }> = {
  pending: { label: '대기', className: 'bg-wait' },
  reviewing: { label: '검토중', className: 'bg-brand' },
  done: { label: '완료', className: 'bg-navy' },
}

export function StatusPill({ status, className }: { status: ReportStatus; className?: string }) {
  const s = STATUS[status]
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-2 text-[10.5px] font-semibold leading-none text-white',
        s.className,
        className,
      )}
    >
      {s.label}
    </span>
  )
}
