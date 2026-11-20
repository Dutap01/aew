// 접수 상세 (대표·상담실장): 신청 내용, 상태 처리, 상담 기록, 학생 등록·기존 학생 연결
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarPlus, Check, ClipboardCheck, LoaderCircle, Phone, UserPlus, Link2 } from 'lucide-react'
import { type FormEvent, type ReactNode, useState } from 'react'
import { Link, useParams } from 'react-router'
import { errorMessage } from '@/api/errors'
import { addInquiryNote, changeInquiryStatus, getInquiry, linkInquiryStudent } from '@/api/inquiries'
import { AppointmentDetailDialog } from '@/components/appointment/AppointmentDetailDialog'
import { type AppointmentFormTarget, AppointmentFormDialog } from '@/components/appointment/AppointmentFormDialog'
import { AppointmentStatusBadge } from '@/components/appointment/AppointmentStatusBadge'
import { Topbar } from '@/components/layout/Topbar'
import { AttemptStatusBadge, formatScore } from '@/components/test/AttemptStatusBadge'
import { TestAccountRow } from '@/components/test/TestAccountRow'
import { IssueAttemptDialog } from '@/components/test/IssueAttemptDialog'
import { Card } from '@/components/ui/Card'
import { INQUIRY_STATUS_LABEL, INQUIRY_TYPE_LABEL, InquiryStatusBadge } from '@/components/ui/InquiryBadges'
import { StudentStatusBadge } from '@/components/ui/StudentStatusBadge'
import type { Appointment } from '@/types/appointment'
import type { InquiryDetail, InquiryStatus, LinkedStudent } from '@/types/inquiry'
import { cn } from '@/utils/cn'
import { formatDateTime, formatShortDate } from '@/utils/format'
import { addDays, seoulParts, todaySeoul } from '@/utils/seoulDate'

const FLOW: InquiryStatus[] = ['received', 'contacted', 'scheduled', 'completed']

/** 상태 버튼 문구 */
const ACTION_LABEL: Record<InquiryStatus, string> = {
  received: '다시 접수로',
  contacted: '연락완료',
  scheduled: '예약확정',
  completed: '완료 처리',
  canceled: '접수 취소',
}

/** 앞 단계로 되돌리는 변경인지 (버튼을 덜 눈에 띄게) */
function isBackward(to: InquiryStatus, from: InquiryStatus): boolean {
  return to === 'received' || FLOW.indexOf(to) < FLOW.indexOf(from)
}

export function InquiryDetailView() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['inquiry', id], queryFn: () => getInquiry(id) })

  /** 변경 응답(상세)으로 화면을 바로 갱신하고, 목록·건수는 다시 불러오게 한다 */
  const onUpdated = (detail: InquiryDetail) => {
    queryClient.setQueryData(['inquiry', id], detail)
    queryClient.invalidateQueries({ queryKey: ['inquiries'] })
    queryClient.invalidateQueries({ queryKey: ['students'] })
  }

  const [formTarget, setFormTarget] = useState<AppointmentFormTarget | null>(null)
  const [selected, setSelected] = useState<Appointment | null>(null)

  if (query.isError) {
    return (
      <>
        <BackLink />
        <Card hoverLift={false}><p role="alert" className="text-sm text-alert">{errorMessage(query.error, '접수를 불러오지 못했습니다.')}</p></Card>
      </>
    )
  }
  const d = query.data
  if (!d) {
    return <div className="h-96 animate-pulse rounded-card bg-white" aria-label="불러오는 중" />
  }

  return (
    <>
      <BackLink />
      <Topbar title={`${d.studentName} · ${INQUIRY_TYPE_LABEL[d.type]} 신청`} subtitle={`접수 ${formatDateTime(d.createdAt)}`} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <ApplicationCard d={d} />
          <NotesCard d={d} onUpdated={onUpdated} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <StatusCard d={d} onUpdated={onUpdated} onSchedule={() => setFormTarget(scheduleTarget(d))} />
          <ScheduleCard d={d} onSchedule={() => setFormTarget(scheduleTarget(d))} onOpen={setSelected} />
          <StudentCard d={d} onUpdated={onUpdated} />
        </div>
      </div>

      <AppointmentFormDialog target={formTarget} onClose={() => setFormTarget(null)} />
      <AppointmentDetailDialog appointment={selected} onClose={() => setSelected(null)} onChanged={setSelected}
        onEdit={(a) => { setSelected(null); setFormTarget({ mode: 'edit', appointment: a }) }} />
    </>
  )
}

/** 일정 잡기 창: 아직 지나지 않은 첫 희망 일정, 없으면 내일 16:00 */
function scheduleTarget(d: InquiryDetail): AppointmentFormTarget {
  const today = todaySeoul()
  const slot = d.preferredSlots.find((s) => s.date >= today)
  return {
    mode: 'create',
    date: slot?.date ?? addDays(today, 1),
    time: slot?.time ?? '16:00',
    inquiry: { id: d.id, type: d.type, studentName: d.studentName, slots: d.preferredSlots },
  }
}

function BackLink() {
  return (
    <Link to="/admin/inquiries" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink">
      <ArrowLeft className="size-3.5" aria-hidden /> 접수 목록
    </Link>
  )
}

function CardTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 className="text-[15px] font-bold text-ink">{children}</h2>
      {right}
    </div>
  )
}

function ApplicationCard({ d }: { d: InquiryDetail }) {
  return (
    <Card hoverLift={false}>
      <CardTitle>신청 내용</CardTitle>
      <dl className="grid grid-cols-[6rem_1fr] gap-x-4 gap-y-3 text-sm">
        <dt className="text-muted">신청자</dt>
        <dd className="text-ink">{d.applicantName}</dd>
        <dt className="text-muted">연락처</dt>
        <dd>
          <a href={`tel:${d.applicantPhone}`} className="inline-flex items-center gap-1 font-semibold text-brand-700 tabular-nums hover:underline">
            <Phone className="size-3.5" aria-hidden /> {d.applicantPhone}
          </a>
        </dd>
        <dt className="text-muted">학생</dt>
        <dd className="text-ink">{d.studentName} <span className="text-muted">{[d.school, d.grade].filter(Boolean).join(' · ')}</span></dd>
        <dt className="text-muted">희망 일정</dt>
        <dd className="space-y-1 text-ink tabular-nums">
          {d.preferredSlots.map((s, i) => <p key={i}>{i + 1}순위 · {formatShortDate(s.date)} {s.time}</p>)}
        </dd>
        <dt className="text-muted">문의 내용</dt>
        <dd className="whitespace-pre-wrap text-ink">{d.message ?? <span className="text-muted">없음</span>}</dd>
      </dl>
    </Card>
  )
}

function StatusCard({ d, onUpdated, onSchedule }: { d: InquiryDetail; onUpdated: (d: InquiryDetail) => void; onSchedule: () => void }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (to: InquiryStatus) => changeInquiryStatus(d.id, to),
    onSuccess: (detail) => {
      onUpdated(detail)
      queryClient.invalidateQueries({ queryKey: ['appointments'] }) // 접수 취소 시 일정도 취소됨
    },
  })
  const currentIndex = FLOW.indexOf(d.status)
  const hasScheduled = d.appointments.some((a) => a.status === 'scheduled')
  // 상담 달력과 어긋나지 않게: 예약이 남아 있으면 완료·연락완료는 일정 쪽에서 처리
  const actions = d.nextStatuses.filter((to) => !(hasScheduled && (to === 'completed' || to === 'contacted')))

  function onClick(to: InquiryStatus) {
    if (to === 'scheduled') return onSchedule() // 예약확정 = 일정 잡기
    if (to === 'canceled' && !window.confirm(hasScheduled ? '이 접수를 취소할까요? 예약된 일정도 함께 취소됩니다.' : '이 접수를 취소할까요?')) return
    mutation.mutate(to)
  }

  return (
    <Card hoverLift={false} index={1}>
      <CardTitle right={<InquiryStatusBadge status={d.status} />}>처리 상태</CardTitle>

      {/* 진행 단계 */}
      <ol className="mb-5 grid grid-cols-4 gap-1" aria-label="처리 단계">
        {FLOW.map((s, i) => {
          const done = d.status !== 'canceled' && i <= currentIndex
          return (
            <li key={s} className="flex flex-col items-center gap-1.5 text-center">
              <span className={cn('flex size-7 items-center justify-center rounded-full text-[11px] font-bold',
                done ? 'bg-brand text-white' : 'bg-track text-muted')}>
                {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
              </span>
              <span className={cn('text-[11px]', i === currentIndex ? 'font-bold text-ink' : 'text-muted')}>{INQUIRY_STATUS_LABEL[s]}</span>
            </li>
          )
        })}
      </ol>
      {d.status === 'canceled' && <p className="mb-4 rounded-xl bg-track px-3 py-2 text-xs text-muted">취소된 접수입니다.</p>}

      {actions.length === 0 ? (
        <p className="text-xs text-muted">처리가 끝난 접수입니다.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {actions.map((to) => (
            <button key={to} type="button" disabled={mutation.isPending} onClick={() => onClick(to)}
              className={cn('h-9 rounded-xl px-3.5 text-xs font-bold transition-colors disabled:opacity-50',
                to === 'canceled' ? 'bg-white text-alert ring-1 ring-alert/30 hover:bg-alert/10'
                  : isBackward(to, d.status) ? 'bg-track text-ink hover:bg-line'
                  : 'bg-brand text-white hover:bg-brand-700')}>
              {to === 'scheduled' ? '예약확정 (일정 잡기)' : ACTION_LABEL[to]}
            </button>
          ))}
        </div>
      )}
      {mutation.isError && <p role="alert" className="mt-3 text-xs text-alert">{errorMessage(mutation.error)}</p>}
      {d.status === 'scheduled' && !hasScheduled && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-wait/15 px-3 py-2 text-xs text-[#a16207]">
          <span>예약확정 상태인데 상담 달력에 일정이 없습니다.</span>
          <button type="button" onClick={onSchedule} className="shrink-0 font-bold underline">일정 잡기</button>
        </div>
      )}
      {hasScheduled && (
        <p className="mt-3 rounded-xl bg-sky-soft px-3 py-2 text-xs text-navy">
          예약된 일정이 있습니다. 일정을 <b>완료</b>하면 접수도 완료되고, 일정을 <b>취소·불참</b> 처리하면 연락완료로 돌아갑니다.
        </p>
      )}
      <p className="mt-4 text-[11px] text-muted">마지막 변경 {formatDateTime(d.updatedAt)}</p>
    </Card>
  )
}

/** 이 접수의 상담·레벨테스트 일정 + 일정 잡기 */
function ScheduleCard({ d, onSchedule, onOpen }: { d: InquiryDetail; onSchedule: () => void; onOpen: (a: Appointment) => void }) {
  const closed = d.status === 'completed' || d.status === 'canceled'
  const openCreate = onSchedule

  return (
    <Card hoverLift={false} index={2}>
      <CardTitle right={
        !closed && (
          <button type="button" onClick={openCreate}
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-brand px-2.5 text-xs font-bold text-white hover:bg-brand-700">
            <CalendarPlus className="size-3.5" aria-hidden /> 일정 잡기
          </button>
        )
      }>{d.type === 'level_test' ? '레벨테스트 일정' : '상담 일정'}</CardTitle>
      {d.appointments.length === 0 ? (
        <p className="text-xs text-muted">{closed ? '잡힌 일정이 없습니다.' : '아직 일정이 없습니다. 희망 일정을 보고 일정을 잡으세요.'}</p>
      ) : (
        <ul className="space-y-2">
          {d.appointments.map((a) => (
            <li key={a.id}>
              <button type="button" onClick={() => onOpen(a)}
                className="flex w-full items-center gap-3 rounded-xl bg-panel px-3 py-2.5 text-left hover:bg-brand-50">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-ink tabular-nums">
                    {formatDateTime(a.startsAt)} ~ {seoulParts(a.endsAt).time}
                  </span>
                  <span className="block truncate text-xs text-muted">담당 {a.counselorName ?? '-'}{a.memo ? ` · ${a.memo}` : ''}</span>
                </span>
                <AppointmentStatusBadge status={a.status} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function StudentCard({ d, onUpdated }: { d: InquiryDetail; onUpdated: (d: InquiryDetail) => void }) {
  const mutation = useMutation({
    mutationFn: (existingStudentId: string | null) => linkInquiryStudent(d.id, existingStudentId),
    onSuccess: onUpdated,
  })

  const [issuing, setIssuing] = useState(false)

  if (d.student) {
    const canIssue = d.type === 'level_test' && d.status !== 'canceled' && d.student.status !== 'withdrawn'
    return (
      <Card hoverLift={false} index={2}>
        <CardTitle>학생</CardTitle>
        <StudentRow s={d.student} action={
          <Link to={`/admin/students/${d.student.id}`} className="text-xs font-semibold text-brand-700 hover:underline">학생 보기</Link>
        } />
        {d.levelTests.length > 0 && (
          <ul className="mt-3 space-y-2">
            {d.levelTests.map((a) => (
              <li key={a.id} className="rounded-xl bg-panel px-3 py-2.5">
                <div className="mb-1.5 flex items-center gap-2">
                  <Link to={`/admin/level-tests/${a.id}`} className="min-w-0 flex-1 truncate text-sm font-bold text-ink hover:text-brand-700 hover:underline">{a.testTitle}</Link>
                  {(a.status === 'graded' || a.status === 'submitted') && <span className="text-xs font-bold text-ink tabular-nums">{formatScore(a.score, a.maxScore)}</span>}
                  <AttemptStatusBadge status={a.status} />
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-xs text-muted">응시 계정</span>
                  <TestAccountRow a={a} />
                </div>
              </li>
            ))}
          </ul>
        )}
        {canIssue && (
          <>
            <button type="button" onClick={() => setIssuing(true)}
              className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-navy text-sm font-bold text-white hover:opacity-90">
              <ClipboardCheck className="size-4" aria-hidden /> 레벨테스트 발급
            </button>
            <p className="mt-1.5 text-[11px] text-muted">학생이 학원에 오면 발급하세요. 레벨테스트 전용 계정이 만들어지고 정해진 시간 뒤에는 로그인할 수 없습니다.</p>
            <IssueAttemptDialog open={issuing} student={{ id: d.student.id, name: d.student.name }} inquiryId={d.id} onClose={() => setIssuing(false)} />
          </>
        )}
      </Card>
    )
  }

  return (
    <Card hoverLift={false} index={3}>
      <CardTitle>학생 등록</CardTitle>
      <p className="mb-3 text-xs text-muted">
        아직 학생으로 등록되지 않은 접수입니다. 등록하면 상담 기록이 학생 타임라인에 함께 남습니다.
      </p>

      {d.similarStudents.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold text-wait">이미 등록된 학생일 수 있습니다 (연락처 또는 이름·학교 일치)</p>
          <ul className="space-y-2">
            {d.similarStudents.map((s) => (
              <li key={s.id}>
                <StudentRow s={s} action={
                  <button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate(s.id)}
                    className="inline-flex h-8 items-center gap-1 rounded-lg bg-track px-2.5 text-xs font-semibold text-ink hover:bg-brand-50 hover:text-brand-800 disabled:opacity-50">
                    <Link2 className="size-3.5" aria-hidden /> 이 학생과 연결
                  </button>
                } />
              </li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" disabled={mutation.isPending}
        onClick={() => {
          if (d.similarStudents.length > 0 && !window.confirm('비슷한 학생이 있습니다. 그래도 새 학생으로 등록할까요?')) return
          mutation.mutate(null)
        }}
        className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-brand text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50">
        {mutation.isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <UserPlus className="size-4" aria-hidden />}
        신청 내용으로 새 학생 등록
      </button>
      {mutation.isError && <p role="alert" className="mt-3 text-xs text-alert">{errorMessage(mutation.error)}</p>}
    </Card>
  )
}

function StudentRow({ s, action }: { s: LinkedStudent; action: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-panel px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">
          {s.name} <span className="font-mono text-xs font-normal text-muted">{s.studentCode}</span>
        </p>
        <p className="truncate text-xs text-muted">{[s.school, s.grade].filter(Boolean).join(' · ') || '학교 정보 없음'}</p>
      </div>
      <StudentStatusBadge status={s.status} />
      {action}
    </div>
  )
}

function NotesCard({ d, onUpdated }: { d: InquiryDetail; onUpdated: (d: InquiryDetail) => void }) {
  const [content, setContent] = useState('')
  const mutation = useMutation({
    mutationFn: (text: string) => addInquiryNote(d.id, text),
    onSuccess: (detail) => {
      setContent('')
      onUpdated(detail)
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (content.trim()) mutation.mutate(content.trim())
  }

  return (
    <Card hoverLift={false} index={1}>
      <CardTitle right={<span className="text-xs text-muted">{d.notes.length}건</span>}>상담 기록</CardTitle>
      <form onSubmit={onSubmit} className="mb-4">
        <label htmlFor="note" className="sr-only">상담 기록</label>
        <textarea id="note" rows={3} maxLength={2000} value={content} onChange={(e) => setContent(e.target.value)}
          placeholder="통화 내용, 학생 상황, 다음 할 일을 적어 두세요."
          className="w-full rounded-xl border border-line bg-white px-3.5 py-3 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/20" />
        <div className="mt-2 flex items-center justify-between">
          {mutation.isError ? <p role="alert" className="text-xs text-alert">{errorMessage(mutation.error)}</p> : <span />}
          <button type="submit" disabled={!content.trim() || mutation.isPending}
            className="h-9 rounded-xl bg-navy px-4 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40">
            기록 저장
          </button>
        </div>
      </form>
      {d.notes.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted">아직 상담 기록이 없습니다.</p>
      ) : (
        <ol className="space-y-3">
          {d.notes.map((n) => (
            <li key={n.id} className="border-l-2 border-brand-200 pl-3">
              <p className="whitespace-pre-wrap text-sm text-ink">{n.content}</p>
              <p className="mt-1 text-[11px] text-muted">{n.authorName} · {formatDateTime(n.createdAt)}</p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}
