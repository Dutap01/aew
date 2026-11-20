// 학생 상세 (대표·상담실장): 기본 정보, 반 소속, 타임라인(접수~지금까지), 상담 기록.
// 반에 넣기·소속 종료는 대표만 (반 배정).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, CalendarDays, CirclePlus, ClipboardCheck, ClipboardList, Flag, Headset, LogIn, LogOut, NotebookPen, Pencil, Phone, Repeat,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'
import { type FormEvent, type ReactNode, useState } from 'react'
import { Link, useParams } from 'react-router'
import { getStudentAttempts } from '@/api/attempts'
import { getClasses } from '@/api/classes'
import { errorMessage } from '@/api/errors'
import { addStudentNote, endEnrollment, enrollStudent, getStudent } from '@/api/students'
import { Field, INPUT_CLASS } from '@/components/form/Field'
import { Topbar } from '@/components/layout/Topbar'
import { StudentAccountRow } from '@/components/student/StudentAccountRow'
import { StudentFormDialog } from '@/components/student/StudentFormDialog'
import { AttemptStatusBadge, formatScore } from '@/components/test/AttemptStatusBadge'
import { IssueAttemptDialog } from '@/components/test/IssueAttemptDialog'
import { Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { StudentStatusBadge } from '@/components/ui/StudentStatusBadge'
import { useAuthStore } from '@/stores/authStore'
import type { StudentDetail, StudentEnrollment, TimelineEvent, TimelineKind } from '@/types/student'
import { cn } from '@/utils/cn'
import { formatDateTime, formatShortDate, toIsoDate } from '@/utils/format'
import { formatSchedules } from '@/utils/schedule'
import { todaySeoul } from '@/utils/seoulDate'

export function StudentDetailView() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const isOwner = useAuthStore((s) => s.user?.role === 'owner')
  const query = useQuery({ queryKey: ['student', id], queryFn: () => getStudent(id) })
  const [editing, setEditing] = useState(false)

  /** 변경 응답(상세)으로 화면을 바로 갱신하고, 목록·반 인원은 다시 불러오게 한다 */
  const onUpdated = (s: StudentDetail) => {
    queryClient.setQueryData(['student', id], s)
    queryClient.invalidateQueries({ queryKey: ['students'] })
    queryClient.invalidateQueries({ queryKey: ['classes'] })
    queryClient.invalidateQueries({ queryKey: ['class'] })
  }

  if (query.isError) {
    return (
      <>
        <BackLink />
        <Card hoverLift={false}><p role="alert" className="text-sm text-alert">{errorMessage(query.error, '학생을 불러오지 못했습니다.')}</p></Card>
      </>
    )
  }
  const s = query.data
  if (!s) return <div className="h-96 animate-pulse rounded-card bg-white" aria-label="불러오는 중" />

  return (
    <>
      <BackLink />
      <Topbar title={s.name} subtitle={<span className="font-mono">{s.studentCode}</span>} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <ProfileCard s={s} onEdit={() => setEditing(true)} />
          <ClassesCard s={s} isOwner={isOwner} onUpdated={onUpdated} />
          <LevelTestCard s={s} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <TimelineCard s={s} onUpdated={onUpdated} />
        </div>
      </div>

      <StudentFormDialog open={editing} student={s} onClose={() => setEditing(false)} onSaved={onUpdated} />
    </>
  )
}

function BackLink() {
  return (
    <Link to="/admin/students" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink">
      <ArrowLeft className="size-3.5" aria-hidden /> 학생 목록
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

const SMALL_BUTTON = 'inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-bold'

function ProfileCard({ s, onEdit }: { s: StudentDetail; onEdit: () => void }) {
  return (
    <Card hoverLift={false}>
      <CardTitle right={
        <div className="flex items-center gap-2">
          <StudentStatusBadge status={s.status} />
          <button type="button" onClick={onEdit} className={cn(SMALL_BUTTON, 'bg-track text-ink hover:bg-brand-50 hover:text-brand-800')}>
            <Pencil className="size-3.5" aria-hidden /> 수정
          </button>
        </div>
      }>기본 정보</CardTitle>
      <dl className="grid grid-cols-[6rem_1fr] gap-x-4 gap-y-3 text-sm">
        <dt className="text-muted">학교 · 학년</dt>
        <dd className="text-ink">{[s.school, s.grade].filter(Boolean).join(' · ') || <Empty />}</dd>
        <dt className="text-muted">학부모</dt>
        <dd className="text-ink">{s.parentName ?? <Empty />}</dd>
        <dt className="text-muted">연락처</dt>
        <dd>
          {s.parentPhone ? (
            <a href={`tel:${s.parentPhone}`} className="inline-flex items-center gap-1 font-semibold whitespace-nowrap text-brand-700 tabular-nums hover:underline">
              <Phone className="size-3.5" aria-hidden /> {s.parentPhone}
            </a>
          ) : <span className="text-xs text-wait">없음 · 안내 문자를 보낼 수 없습니다</span>}
        </dd>
        <dt className="text-muted">학생 계정</dt>
        <dd className="text-ink"><StudentAccountRow studentId={s.id} studentName={s.name} loginId={s.loginId} /></dd>
        <dt className="text-muted">메모</dt>
        <dd className="whitespace-pre-wrap text-ink">{s.memo ?? <Empty />}</dd>
      </dl>
      <p className="mt-4 text-[11px] text-muted">등록 {formatDateTime(s.createdAt)} · 마지막 변경 {formatDateTime(s.updatedAt)}</p>
    </Card>
  )
}

function Empty() {
  return <span className="text-muted">-</span>
}

function ClassesCard({ s, isOwner, onUpdated }: { s: StudentDetail; isOwner: boolean; onUpdated: (s: StudentDetail) => void }) {
  const [enrolling, setEnrolling] = useState(false)
  const [ending, setEnding] = useState<StudentEnrollment | null>(null)
  const current = s.enrollments.filter((e) => !e.endDate)
  const past = s.enrollments.filter((e) => e.endDate)

  return (
    <Card hoverLift={false} index={1}>
      <CardTitle right={isOwner && s.status !== 'withdrawn' && (
        <button type="button" onClick={() => setEnrolling(true)} className={cn(SMALL_BUTTON, 'bg-brand text-white hover:bg-brand-700')}>
          <CirclePlus className="size-3.5" aria-hidden /> 반에 넣기
        </button>
      )}>반</CardTitle>

      {current.length === 0 ? (
        <p className="text-xs text-muted">
          지금 소속된 반이 없습니다.{!isOwner && ' 반 배정은 대표가 합니다.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {current.map((e) => (
            <li key={e.id} className="flex items-center gap-3 rounded-xl bg-panel px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">
                  {e.className} <span className="text-xs font-normal text-muted">{e.level} · {e.teacherName ?? '강사 미정'}</span>
                </p>
                <p className="truncate text-xs text-muted tabular-nums">{formatSchedules(e.schedules)} · {formatShortDate(e.startDate)}부터</p>
              </div>
              {isOwner && (
                <button type="button" onClick={() => setEnding(e)}
                  className={cn(SMALL_BUTTON, 'shrink-0 bg-white text-muted ring-1 ring-line hover:text-alert hover:ring-alert/30')}>
                  소속 종료
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {past.length > 0 && (
        <details className="mt-4 text-xs">
          <summary className="cursor-pointer font-semibold text-muted hover:text-ink">지난 반 {past.length}개</summary>
          <ul className="mt-2 space-y-1.5 text-muted tabular-nums">
            {past.map((e) => (
              <li key={e.id}>{e.className} · {formatShortDate(e.startDate)} ~ {formatShortDate(e.endDate!)}</li>
            ))}
          </ul>
        </details>
      )}

      {isOwner && <EnrollDialog open={enrolling} s={s} onClose={() => setEnrolling(false)} onUpdated={onUpdated} />}
      {isOwner && <EndEnrollmentDialog enrollment={ending} s={s} onClose={() => setEnding(null)} onUpdated={onUpdated} />}
    </Card>
  )
}

/** 반에 넣기: 운영 중인 반 중에서 고른다. 학년과 레벨이 맞는 반을 먼저 */
function EnrollDialog({ open, s, onClose, onUpdated }: { open: boolean; s: StudentDetail; onClose: () => void; onUpdated: (s: StudentDetail) => void }) {
  const classes = useQuery({ queryKey: ['classes', { all: false }], queryFn: () => getClasses(), enabled: open })
  const [classId, setClassId] = useState('')
  const [startDate, setStartDate] = useState(todaySeoul())
  const mutation = useMutation({
    mutationFn: () => enrollStudent(s.id, classId, startDate || null),
    onSuccess: (d) => { onUpdated(d); close() },
  })
  const joined = new Set(s.enrollments.filter((e) => !e.endDate).map((e) => e.classId))
  const options = (classes.data ?? []).filter((c) => !joined.has(c.id))

  function close() {
    setClassId('')
    mutation.reset()
    onClose()
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (classId) mutation.mutate()
  }

  return (
    <Dialog open={open} onClose={close} title={`${s.name} 반에 넣기`}>
      <form onSubmit={onSubmit} className="space-y-4">
        {classes.isLoading ? (
          <div className="h-40 animate-pulse rounded-xl bg-track" aria-label="불러오는 중" />
        ) : options.length === 0 ? (
          <p className="text-sm text-muted">넣을 수 있는 반이 없습니다. 반 구성에서 반을 먼저 만드세요.</p>
        ) : (
          <fieldset>
            <legend className="mb-1.5 text-xs font-semibold text-ink">반</legend>
            <ul className="max-h-72 space-y-1.5 overflow-y-auto">
              {options.map((c) => {
                const full = c.capacity !== null && c.studentCount >= c.capacity
                return (
                  <li key={c.id}>
                    <label className={cn('flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ring-1',
                      classId === c.id ? 'bg-brand-50 ring-brand' : 'ring-line hover:bg-panel', full && 'cursor-not-allowed opacity-50')}>
                      <input type="radio" name="class" value={c.id} checked={classId === c.id} disabled={full}
                        onChange={() => setClassId(c.id)} className="accent-brand" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-ink">{c.name} <span className="text-xs font-normal text-muted">{c.level} · {c.teacherName ?? '강사 미정'}</span></span>
                        <span className="block truncate text-xs text-muted tabular-nums">{formatSchedules(c.schedules)}</span>
                      </span>
                      <span className={cn('shrink-0 text-xs tabular-nums', full ? 'font-bold text-alert' : 'text-muted')}>
                        {c.studentCount}{c.capacity !== null && ` / ${c.capacity}`}명{full && ' 마감'}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </fieldset>
        )}
        <Field label="수업 시작일" htmlFor="enroll-start">
          <input id="enroll-start" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className={INPUT_CLASS} />
        </Field>
        {s.status !== 'enrolled' && <p className="text-[11px] text-muted">반에 넣으면 학생 상태가 재원으로 바뀝니다.</p>}
        {mutation.isError && <p role="alert" className="rounded-xl bg-alert/10 px-3 py-2 text-xs text-alert">{errorMessage(mutation.error)}</p>}
        <DialogButtons onCancel={close} disabled={!classId || mutation.isPending} label="반에 넣기" />
      </form>
    </Dialog>
  )
}

function EndEnrollmentDialog({ enrollment, s, onClose, onUpdated }: {
  enrollment: StudentEnrollment | null; s: StudentDetail; onClose: () => void; onUpdated: (s: StudentDetail) => void
}) {
  const [endDate, setEndDate] = useState(todaySeoul())
  const mutation = useMutation({
    mutationFn: () => endEnrollment(s.id, enrollment!.id, endDate || null),
    onSuccess: (d) => { onUpdated(d); close() },
  })

  function close() {
    mutation.reset()
    setEndDate(todaySeoul())
    onClose()
  }

  return (
    <Dialog open={enrollment !== null} onClose={close} title={`${enrollment?.className ?? ''} 반 소속 종료`}>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="space-y-4">
        <Field label="마지막 수업일" htmlFor="enroll-end" hint="이 날짜 이후로는 시간표·출석부에 나오지 않습니다.">
          <input id="enroll-end" type="date" required min={enrollment?.startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} className={INPUT_CLASS} />
        </Field>
        <p className="text-[11px] text-muted">학생 상태는 바뀌지 않습니다. 반을 옮기는 경우 새 반에 넣고, 그만두는 경우 학생 상태를 휴원·퇴원으로 바꾸세요.</p>
        {mutation.isError && <p role="alert" className="rounded-xl bg-alert/10 px-3 py-2 text-xs text-alert">{errorMessage(mutation.error)}</p>}
        <DialogButtons onCancel={close} disabled={mutation.isPending} label="소속 종료" danger />
      </form>
    </Dialog>
  )
}

function DialogButtons({ onCancel, disabled, label, danger }: { onCancel: () => void; disabled: boolean; label: string; danger?: boolean }) {
  return (
    <div className="flex justify-end gap-2 pt-1">
      <button type="button" onClick={onCancel} className="h-10 rounded-xl px-4 text-sm font-semibold text-muted hover:bg-track">취소</button>
      <button type="submit" disabled={disabled}
        className={cn('h-10 rounded-xl px-5 text-sm font-bold text-white disabled:opacity-50', danger ? 'bg-alert hover:opacity-90' : 'bg-brand hover:bg-brand-700')}>
        {label}
      </button>
    </div>
  )
}

/** 이 학생의 레벨테스트 + 발급 */
function LevelTestCard({ s }: { s: StudentDetail }) {
  const [issuing, setIssuing] = useState(false)
  const attempts = useQuery({ queryKey: ['student-attempts', s.id], queryFn: () => getStudentAttempts(s.id) })
  return (
    <Card hoverLift={false} index={2}>
      <CardTitle right={s.status !== 'withdrawn' && (
        <button type="button" onClick={() => setIssuing(true)} className={cn(SMALL_BUTTON, 'bg-navy text-white hover:opacity-90')}>
          <ClipboardCheck className="size-3.5" aria-hidden /> 레벨테스트 발급
        </button>
      )}>레벨테스트</CardTitle>
      {attempts.isError ? (
        <p role="alert" className="text-xs text-alert">{errorMessage(attempts.error)}</p>
      ) : !attempts.data ? (
        <div className="h-12 animate-pulse rounded-xl bg-track" />
      ) : attempts.data.length === 0 ? (
        <p className="text-xs text-muted">아직 응시 기록이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {attempts.data.map((a) => (
            <li key={a.id}>
              <Link to={`/admin/level-tests/${a.id}`} className="flex items-center gap-3 rounded-xl bg-panel px-3 py-2.5 hover:bg-brand-50">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-ink">{a.testTitle}</span>
                  <span className="block text-xs text-muted tabular-nums">
                    {a.submittedAt ? `${formatDateTime(a.submittedAt)} 제출` : `${formatDateTime(a.issuedAt)} 발급`}
                  </span>
                </span>
                {(a.status === 'graded' || a.status === 'submitted') && (
                  <span className="text-sm font-bold text-ink tabular-nums">{formatScore(a.score, a.maxScore)}</span>
                )}
                <AttemptStatusBadge status={a.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <IssueAttemptDialog open={issuing} student={{ id: s.id, name: s.name }} onClose={() => setIssuing(false)} />
    </Card>
  )
}

const KIND: Record<TimelineKind, { icon: LucideIcon; tone: string }> = {
  created: { icon: UserPlus, tone: 'bg-brand-50 text-brand-700' },
  inquiry: { icon: Headset, tone: 'bg-sky-soft text-navy' },
  note: { icon: NotebookPen, tone: 'bg-track text-ink' },
  appointment: { icon: CalendarDays, tone: 'bg-grape-50 text-grape' },
  level_test: { icon: ClipboardCheck, tone: 'bg-navy text-white' },
  enrollment_start: { icon: LogIn, tone: 'bg-brand-50 text-brand-700' },
  enrollment_end: { icon: LogOut, tone: 'bg-track text-muted' },
  status_change: { icon: Repeat, tone: 'bg-wait/15 text-[#a16207]' },
}

/** 학생에게 있었던 일 (최신 먼저) + 상담 기록 쓰기 */
function TimelineCard({ s, onUpdated }: { s: StudentDetail; onUpdated: (s: StudentDetail) => void }) {
  const [content, setContent] = useState('')
  const mutation = useMutation({
    mutationFn: (text: string) => addStudentNote(s.id, text),
    onSuccess: (d) => { setContent(''); onUpdated(d) },
  })
  const now = Date.now()

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (content.trim()) mutation.mutate(content.trim())
  }

  return (
    <Card hoverLift={false} index={2}>
      <CardTitle right={<span className="text-xs text-muted">{s.timeline.length}건</span>}>타임라인</CardTitle>
      <form onSubmit={onSubmit} className="mb-5">
        <label htmlFor="student-note" className="sr-only">상담 기록</label>
        <textarea id="student-note" rows={2} maxLength={2000} value={content} onChange={(e) => setContent(e.target.value)}
          placeholder="학부모 통화, 학습 상황 등 상담 기록을 남기세요."
          className="w-full rounded-xl border border-line bg-white px-3.5 py-3 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/20" />
        <div className="mt-2 flex items-center justify-between">
          {mutation.isError ? <p role="alert" className="text-xs text-alert">{errorMessage(mutation.error)}</p> : <span />}
          <button type="submit" disabled={!content.trim() || mutation.isPending}
            className="h-9 rounded-xl bg-navy px-4 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40">
            기록 저장
          </button>
        </div>
      </form>

      <ol className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-line">
        {s.timeline.map((ev, i) => <TimelineItem key={i} ev={ev} upcoming={new Date(ev.at).getTime() > now} />)}
      </ol>
      <p className="mt-5 flex items-center gap-1.5 text-[11px] text-muted">
        <ClipboardList className="size-3.5" aria-hidden /> 레벨테스트·진단서·숙제·리포트 이력은 해당 기능이 생기면 여기에 함께 나옵니다.
      </p>
    </Card>
  )
}

function TimelineItem({ ev, upcoming }: { ev: TimelineEvent; upcoming: boolean }) {
  const { icon: Icon, tone } = KIND[ev.kind]
  const href = !ev.refId ? null : ev.kind === 'inquiry' ? `/admin/inquiries/${ev.refId}` : ev.kind === 'level_test' ? `/admin/level-tests/${ev.refId}` : null
  const title = href ? <Link to={href} className="hover:text-brand-700 hover:underline">{ev.title}</Link> : ev.title
  // 반 시작·종료는 날짜만 의미가 있다
  const dateOnly = ev.kind === 'enrollment_start' || ev.kind === 'enrollment_end'

  return (
    <li className="relative flex gap-3">
      <span className={cn('relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white', tone)}>
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <p className="text-sm font-semibold text-ink">
          {title}
          {upcoming && <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-grape-50 px-1.5 py-0.5 align-middle text-[10px] font-bold text-grape"><Flag className="size-2.5" aria-hidden />예정</span>}
        </p>
        {ev.detail && <p className="mt-0.5 text-sm whitespace-pre-wrap text-ink/80">{ev.detail}</p>}
        <p className="mt-0.5 text-[11px] text-muted tabular-nums">
          {dateOnly ? formatShortDate(toIsoDate(new Date(ev.at))) : formatDateTime(ev.at)}
          {ev.actorName && ` · ${ev.actorName}`}
        </p>
      </div>
    </li>
  )
}

