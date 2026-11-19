import type { StudentStatus } from '@/types/student'
import { cn } from '@/utils/cn'

export const STUDENT_STATUS_LABEL: Record<StudentStatus, string> = {
  consulting: '상담중',
  test_scheduled: '테스트예정',
  enrolled: '재원',
  paused: '휴원',
  withdrawn: '퇴원',
}

const TONE: Record<StudentStatus, string> = {
  consulting: 'bg-sky-soft text-navy',
  test_scheduled: 'bg-grape-50 text-grape',
  enrolled: 'bg-brand-50 text-brand-800',
  paused: 'bg-wait/15 text-[#a16207]',
  withdrawn: 'bg-track text-muted',
}

export function StudentStatusBadge({ status, className }: { status: StudentStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold whitespace-nowrap',
        TONE[status],
        className,
      )}
    >
      {STUDENT_STATUS_LABEL[status]}
    </span>
  )
}
