// 상담 일정 상세 창: 정보 + 완료·불참·취소·되돌리기·일정 변경
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { changeAppointmentStatus } from '@/api/appointments'
import { errorMessage } from '@/api/errors'
import { Dialog } from '@/components/ui/Dialog'
import { InquiryTypeBadge } from '@/components/ui/InquiryBadges'
import type { Appointment, AppointmentStatus } from '@/types/appointment'
import { cn } from '@/utils/cn'
import { formatDateTime } from '@/utils/format'
import { seoulParts } from '@/utils/seoulDate'
import { AppointmentStatusBadge } from './AppointmentStatusBadge'

interface Props {
  appointment: Appointment | null
  onClose: () => void
  onEdit: (a: Appointment) => void
  /** 상태가 바뀐 뒤 (창에 최신 내용 반영용) */
  onChanged: (a: Appointment) => void
}

export function AppointmentDetailDialog({ appointment: a, onClose, onEdit, onChanged }: Props) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (status: AppointmentStatus) => changeAppointmentStatus(a!.id, status),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['inquiry'] })
      queryClient.invalidateQueries({ queryKey: ['inquiries'] })
      onChanged(updated)
    },
  })

  function act(status: AppointmentStatus, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return
    mutation.mutate(status)
  }

  const scheduled = a?.status === 'scheduled'
  return (
    <Dialog open={a !== null} onClose={() => { mutation.reset(); onClose() }} title={a?.title ?? ''}
      footer={a && (
        scheduled ? (
          <>
            <Action onClick={() => act('canceled', '이 일정을 취소할까요?')} tone="danger" disabled={mutation.isPending}>취소</Action>
            <Action onClick={() => act('no_show')} tone="quiet" disabled={mutation.isPending}>불참</Action>
            <Action onClick={() => onEdit(a)} tone="quiet" disabled={mutation.isPending}>일정 변경</Action>
            <Action onClick={() => act('done')} tone="primary" disabled={mutation.isPending}>완료</Action>
          </>
        ) : (
          <Action onClick={() => act('scheduled')} tone="quiet" disabled={mutation.isPending}>예약으로 되돌리기</Action>
        )
      )}>
      {a && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            <InquiryTypeBadge type={a.kind} />
            <AppointmentStatusBadge status={a.status} />
          </div>
          <dl className="grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-2.5 text-sm">
            <dt className="text-muted">시간</dt>
            <dd className="text-ink tabular-nums">{formatDateTime(a.startsAt)} ~ {seoulParts(a.endsAt).time}</dd>
            <dt className="text-muted">담당자</dt>
            <dd className="text-ink">{a.counselorName ?? '-'}</dd>
            <dt className="text-muted">학생</dt>
            <dd>
              {a.studentId ? (
                <Link to={`/admin/students/${a.studentId}`} className="font-semibold text-brand-700 hover:underline">
                  {a.studentName} <span className="font-mono text-xs font-normal text-muted">{a.studentCode}</span>
                </Link>
              ) : <span className="text-muted">연결 안 됨</span>}
            </dd>
            {a.inquiryId && (
              <>
                <dt className="text-muted">접수</dt>
                <dd><Link to={`/admin/inquiries/${a.inquiryId}`} className="font-semibold text-brand-700 hover:underline">접수 내용 보기</Link></dd>
              </>
            )}
            <dt className="text-muted">메모</dt>
            <dd className="whitespace-pre-wrap text-ink">{a.memo ?? <span className="text-muted">없음</span>}</dd>
          </dl>
          {a.inquiryId && scheduled && <p className="mt-4 text-[11px] text-muted">완료하면 접수도 완료로, 취소·불참하면 접수가 연락완료로 돌아갑니다.</p>}
          {mutation.isError && <p role="alert" className="mt-3 rounded-xl bg-alert/10 px-3 py-2 text-xs text-alert">{errorMessage(mutation.error)}</p>}
        </>
      )}
    </Dialog>
  )
}

function Action({ onClick, tone, disabled, children }: { onClick: () => void; tone: 'primary' | 'quiet' | 'danger'; disabled?: boolean; children: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={cn('h-9 rounded-xl px-3.5 text-xs font-bold disabled:opacity-50',
        tone === 'primary' && 'bg-brand text-white hover:bg-brand-700',
        tone === 'quiet' && 'bg-track text-ink hover:bg-line',
        tone === 'danger' && 'text-alert ring-1 ring-alert/30 hover:bg-alert/10')}>
      {children}
    </button>
  )
}
