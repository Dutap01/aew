// 상담 일정 등록·변경 창. 상담 달력과 접수 상세에서 함께 쓴다.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LoaderCircle } from 'lucide-react'
import { type FormEvent, type ReactNode, useState } from 'react'
import { createAppointment, getCounselors, updateAppointment } from '@/api/appointments'
import { errorMessage } from '@/api/errors'
import { Dialog } from '@/components/ui/Dialog'
import { INQUIRY_TYPE_LABEL } from '@/components/ui/InquiryBadges'
import { useAuthStore } from '@/stores/authStore'
import type { Appointment } from '@/types/appointment'
import type { InquiryType, PreferredSlot } from '@/types/inquiry'
import { cn } from '@/utils/cn'
import { formatShortDate } from '@/utils/format'
import { minutesToTime, seoulParts, toSeoulIso } from '@/utils/seoulDate'

const INPUT = 'h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20'
// 09:00 ~ 21:30, 10분 간격
const TIMES = Array.from({ length: (22 - 9) * 6 }, (_, i) => minutesToTime(9 * 60 + i * 10))
const LENGTHS = [20, 30, 40, 60, 90, 120]

export type AppointmentFormTarget =
  /** 새 일정: 접수에서(제목·종류는 접수에서) 또는 달력 빈칸에서 */
  | { mode: 'create'; date: string; time: string; inquiry?: { id: string; type: InquiryType; studentName: string; slots: PreferredSlot[] } }
  /** 기존 일정 변경 */
  | { mode: 'edit'; appointment: Appointment }

interface Props {
  target: AppointmentFormTarget | null
  onClose: () => void
  onSaved?: (a: Appointment) => void
}

export function AppointmentFormDialog({ target, onClose, onSaved }: Props) {
  return (
    <Dialog open={target !== null} onClose={onClose}
      title={target?.mode === 'edit' ? '일정 변경' : target?.inquiry ? `${target.inquiry.studentName} ${INQUIRY_TYPE_LABEL[target.inquiry.type]} 일정 잡기` : '새 상담 일정'}>
      {/* target 이 바뀔 때마다 입력값을 새로 시작 */}
      {target && <Form key={target.mode === 'edit' ? target.appointment.id : `${target.date}-${target.time}`} target={target} onClose={onClose} onSaved={onSaved} />}
    </Dialog>
  )
}

function Form({ target, onClose, onSaved }: { target: AppointmentFormTarget; onClose: () => void; onSaved?: (a: Appointment) => void }) {
  const me = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const counselors = useQuery({ queryKey: ['counselors'], queryFn: getCounselors, staleTime: 5 * 60_000 })

  const editing = target.mode === 'edit' ? target.appointment : null
  const inquiry = target.mode === 'create' ? target.inquiry : undefined
  const start = editing ? seoulParts(editing.startsAt) : null
  const lengthOf = (a: Appointment) => Math.round((new Date(a.endsAt).getTime() - new Date(a.startsAt).getTime()) / 60000)

  const [kind, setKind] = useState<InquiryType>(editing?.kind ?? inquiry?.type ?? 'consult')
  const [title, setTitle] = useState(editing?.title ?? '')
  const [date, setDate] = useState(start?.date ?? (target.mode === 'create' ? target.date : ''))
  const [time, setTime] = useState(start?.time ?? (target.mode === 'create' ? target.time : '16:00'))
  const [length, setLength] = useState(editing ? lengthOf(editing) : kind === 'level_test' ? 60 : 30)
  const [counselorId, setCounselorId] = useState(editing?.counselorId ?? me?.id ?? '')
  const [memo, setMemo] = useState(editing?.memo ?? '')

  const mutation = useMutation({
    mutationFn: () => {
      const startsAt = toSeoulIso(date, time)
      const endsAt = new Date(new Date(startsAt).getTime() + length * 60000).toISOString()
      if (editing) {
        return updateAppointment(editing.id, { title: title.trim(), startsAt, endsAt, counselorId: counselorId || null, memo: memo.trim() || null })
      }
      return createAppointment({
        inquiryId: inquiry?.id ?? null,
        kind: inquiry ? null : kind,
        title: inquiry ? null : title.trim() || null,
        startsAt,
        endsAt,
        counselorId: counselorId || null,
        memo: memo.trim() || null,
      })
    },
    onSuccess: (a) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['inquiry'] })
      queryClient.invalidateQueries({ queryKey: ['inquiries'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      onSaved?.(a)
      onClose()
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate()
  }

  const timeOptions = TIMES.includes(time) ? TIMES : [...TIMES, time].sort()

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {inquiry && inquiry.slots.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-ink">학부모 희망 일정</p>
          <div className="flex flex-wrap gap-1.5">
            {inquiry.slots.map((s, i) => {
              const active = s.date === date && s.time === time
              return (
                <button key={i} type="button" onClick={() => { setDate(s.date); setTime(s.time) }} aria-pressed={active}
                  className={cn('h-8 rounded-full px-3 text-xs font-semibold tabular-nums', active ? 'bg-brand text-white' : 'bg-track text-ink hover:bg-brand-50')}>
                  {i + 1}순위 {formatShortDate(s.date)} {s.time}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {!inquiry && !editing && (
        <Row label="종류">
          <div className="flex gap-1.5" role="radiogroup" aria-label="종류">
            {(['consult', 'level_test'] as InquiryType[]).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k}
                onClick={() => { setKind(k); setLength(k === 'level_test' ? 60 : 30) }}
                className={cn('h-9 flex-1 rounded-xl text-xs font-bold', kind === k ? 'bg-brand text-white' : 'bg-track text-ink hover:bg-brand-50')}>
                {INQUIRY_TYPE_LABEL[k]}
              </button>
            ))}
          </div>
        </Row>
      )}

      {!inquiry && (
        <Row label="제목" htmlFor="appt-title">
          <input id="appt-title" required maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 김민준 학부모 상담" className={INPUT} />
        </Row>
      )}

      <div className="grid grid-cols-[1fr_6.5rem] gap-3">
        <Row label="날짜" htmlFor="appt-date">
          <input id="appt-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={INPUT} />
        </Row>
        <Row label="시작" htmlFor="appt-time">
          <select id="appt-time" value={time} onChange={(e) => setTime(e.target.value)} className={INPUT}>
            {timeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Row>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Row label="시간" htmlFor="appt-length">
          <select id="appt-length" value={length} onChange={(e) => setLength(Number(e.target.value))} className={INPUT}>
            {[...new Set([...LENGTHS, length])].sort((a, b) => a - b).map((m) => <option key={m} value={m}>{m}분</option>)}
          </select>
        </Row>
        <Row label="담당자" htmlFor="appt-counselor">
          <select id="appt-counselor" value={counselorId} onChange={(e) => setCounselorId(e.target.value)} className={INPUT}>
            {counselors.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Row>
      </div>

      <Row label="메모" htmlFor="appt-memo">
        <textarea id="appt-memo" rows={2} maxLength={1000} value={memo} onChange={(e) => setMemo(e.target.value)}
          className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
      </Row>

      {inquiry && <p className="text-[11px] text-muted">저장하면 접수 상태가 예약확정으로 바뀝니다.</p>}
      {mutation.isError && <p role="alert" className="rounded-xl bg-alert/10 px-3 py-2 text-xs text-alert">{errorMessage(mutation.error)}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-sm font-semibold text-muted hover:bg-track">취소</button>
        <button type="submit" disabled={mutation.isPending}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50">
          {mutation.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          {editing ? '변경 저장' : '일정 저장'}
        </button>
      </div>
    </form>
  )
}

function Row({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-ink">{label}</label>
      {children}
    </div>
  )
}
