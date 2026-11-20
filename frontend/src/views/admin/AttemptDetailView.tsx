// 레벨테스트 응시 결과 (대표·상담실장): 총점, 영역별 점수, 문항별 정오. 서술형은 여기서 채점한다.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, LoaderCircle, X } from 'lucide-react'
import { type FormEvent, type ReactNode, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { cancelAttempt, forceSubmitAttempt, getAttempt, scoreEssay } from '@/api/attempts'
import { errorMessage } from '@/api/errors'
import { Topbar } from '@/components/layout/Topbar'
import { TestAccountRow } from '@/components/test/TestAccountRow'
import { AttemptStatusBadge, formatScore } from '@/components/test/AttemptStatusBadge'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { AttemptDetail, AttemptItemResult } from '@/types/test'
import { cn } from '@/utils/cn'
import { formatDateTime } from '@/utils/format'

const TYPE_LABEL = { choice: '객관식', short: '단답형', essay: '서술형' } as const

export function AttemptDetailView() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['attempt', id], queryFn: () => getAttempt(id) })
  const onUpdated = (d: AttemptDetail) => {
    queryClient.setQueryData(['attempt', id], d)
    queryClient.invalidateQueries({ queryKey: ['attempts'] })
    queryClient.invalidateQueries({ queryKey: ['student', d.summary.studentId] })
    queryClient.invalidateQueries({ queryKey: ['student-attempts', d.summary.studentId] })
  }

  if (query.isError) {
    return (
      <>
        <BackLink />
        <Card hoverLift={false}><p role="alert" className="text-sm text-alert">{errorMessage(query.error, '결과를 불러오지 못했습니다.')}</p></Card>
      </>
    )
  }
  const d = query.data
  if (!d) return <div className="h-96 animate-pulse rounded-card bg-white" aria-label="불러오는 중" />
  const s = d.summary
  const finished = s.status === 'submitted' || s.status === 'graded'

  return (
    <>
      <BackLink />
      <Topbar title={`${s.studentName} · ${s.testTitle}`} subtitle={<span className="font-mono">{s.studentCode}</span>} />

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <SummaryCard d={d} onUpdated={onUpdated} />
        <AreasCard d={d} finished={finished} />
      </div>
      <ItemsCard d={d} finished={finished} onUpdated={onUpdated} />
    </>
  )
}

function BackLink() {
  return (
    <Link to="/admin/level-tests" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink">
      <ArrowLeft className="size-3.5" aria-hidden /> 레벨테스트 결과
    </Link>
  )
}

function SummaryCard({ d, onUpdated }: { d: AttemptDetail; onUpdated: (d: AttemptDetail) => void }) {
  const s = d.summary
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const pct = s.score !== null && s.maxScore ? Math.round((s.score / s.maxScore) * 100) : null
  const cancel = useMutation({
    mutationFn: () => cancelAttempt(s.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attempts'] })
      queryClient.invalidateQueries({ queryKey: ['student-attempts', s.studentId] })
      navigate(`/admin/students/${s.studentId}`)
    },
  })
  const submit = useMutation({ mutationFn: () => forceSubmitAttempt(s.id), onSuccess: onUpdated })
  const error = cancel.error ?? submit.error

  return (
    <Card hoverLift={false}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-bold text-ink">결과</h2>
        <AttemptStatusBadge status={s.status} />
      </div>
      {s.status === 'graded' || s.status === 'submitted' ? (
        <div className="mb-4">
          <p className="text-3xl font-extrabold text-ink tabular-nums">
            {formatScore(s.score, s.maxScore)}
            {pct !== null && <span className="ml-2 text-base font-bold text-muted">{pct}%</span>}
          </p>
          {s.status === 'submitted' && <p className="mt-1 text-xs text-[#a16207]">서술형 채점이 남아 있습니다. 아래 문항에서 점수를 넣으세요.</p>}
        </div>
      ) : (
        <p className="mb-4 rounded-xl bg-panel px-3 py-3 text-sm text-muted">
          {s.status === 'issued' ? '학생이 아직 시작하지 않았습니다.' : '학생이 응시 중입니다. 제출하면 자동채점됩니다.'}
        </p>
      )}
      <dl className="grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-2 text-xs">
        <dt className="text-muted">학생</dt>
        <dd><Link to={`/admin/students/${s.studentId}`} className="font-semibold text-brand-700 hover:underline">{s.studentName}</Link>{s.grade && ` · ${s.grade}`}</dd>
        <dt className="pt-1.5 text-muted">응시 계정</dt>
        <dd><TestAccountRow a={s} /></dd>
        <dt className="text-muted">발급</dt>
        <dd className="text-ink tabular-nums">{formatDateTime(s.issuedAt)}{s.issuedByName && ` · ${s.issuedByName}`}</dd>
        <dt className="text-muted">시작</dt>
        <dd className="text-ink tabular-nums">{s.startedAt ? formatDateTime(s.startedAt) : '-'}{d.timeLimitMinutes && ` (제한 ${d.timeLimitMinutes}분)`}</dd>
        <dt className="text-muted">제출</dt>
        <dd className="text-ink tabular-nums">{s.submittedAt ? formatDateTime(s.submittedAt) : '-'}</dd>
        {d.ruleVersion && <><dt className="text-muted">채점 룰</dt><dd className="font-mono text-ink">{d.ruleVersion}</dd></>}
      </dl>
      {(s.status === 'issued' || s.status === 'in_progress') && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
          {s.status === 'issued' && (
            <button type="button" disabled={cancel.isPending}
              onClick={() => window.confirm('발급을 취소할까요?') && cancel.mutate()}
              className="h-9 rounded-xl bg-white px-3.5 text-xs font-bold text-alert ring-1 ring-alert/30 hover:bg-alert/10 disabled:opacity-50">
              발급 취소
            </button>
          )}
          {s.status === 'in_progress' && (
            <button type="button" disabled={submit.isPending}
              onClick={() => window.confirm('학생 대신 지금까지 저장된 답으로 제출할까요?') && submit.mutate()}
              className="h-9 rounded-xl bg-navy px-3.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50">
              대신 제출
            </button>
          )}
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-xs text-alert">{errorMessage(error)}</p>}
    </Card>
  )
}

/** 영역별 점수 막대 */
function AreasCard({ d, finished }: { d: AttemptDetail; finished: boolean }) {
  return (
    <Card hoverLift={false} index={1}>
      <h2 className="mb-4 text-[15px] font-bold text-ink">영역별</h2>
      <ul className="space-y-4">
        {d.areas.map((a) => {
          const pct = a.maxScore ? (a.score / a.maxScore) * 100 : 0
          return (
            <li key={a.area}>
              <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                <span className="font-bold text-ink">{a.area}</span>
                <span className="text-xs text-muted tabular-nums">
                  {finished ? <>정답 {a.correct}/{a.total} · <b className="text-ink">{formatScore(a.score, a.maxScore)}</b></> : `${a.total}문항`}
                  {a.pending > 0 && <span className="ml-1 text-[#a16207]">(채점대기 {a.pending})</span>}
                </span>
              </div>
              <ProgressBar value={finished ? pct : 0} label={`${a.area} ${Math.round(pct)}%`}
                barClassName={pct >= 80 ? 'bg-brand' : pct >= 50 ? 'bg-wait' : 'bg-alert'} className="h-2" />
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function ItemsCard({ d, finished, onUpdated }: { d: AttemptDetail; finished: boolean; onUpdated: (d: AttemptDetail) => void }) {
  const [onlyWrong, setOnlyWrong] = useState(false)
  const items = onlyWrong ? d.items.filter((i) => i.isCorrect !== true) : d.items
  return (
    <Card hoverLift={false} index={2} className="p-0">
      <div className="flex items-center justify-between gap-2 px-5 pt-5 pb-3">
        <h2 className="text-[15px] font-bold text-ink">문항별 <span className="text-xs font-normal text-muted">{d.items.length}문항</span></h2>
        {finished && (
          <label className="flex items-center gap-1.5 text-xs font-semibold text-muted">
            <input type="checkbox" checked={onlyWrong} onChange={(e) => setOnlyWrong(e.target.checked)} className="size-4 accent-brand" />
            틀린 문항만
          </label>
        )}
      </div>
      <ol className="divide-y divide-line border-t border-line">
        {items.map((it) => <ItemRow key={it.itemId} attemptId={d.summary.id} it={it} finished={finished} onUpdated={onUpdated} />)}
      </ol>
    </Card>
  )
}

function ItemRow({ attemptId, it, finished, onUpdated }: { attemptId: string; it: AttemptItemResult; finished: boolean; onUpdated: (d: AttemptDetail) => void }) {
  return (
    <li className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 px-5 py-4 sm:grid-cols-[2.25rem_minmax(0,1fr)_6.5rem]">
      <Mark it={it} finished={finished} />
      <div className="min-w-0">
        <p className="mb-1 text-[11px] text-muted">{it.seq}번 · {it.area} · {TYPE_LABEL[it.type]} · <span className="font-mono">{it.itemCode}</span></p>
        <p className="text-sm font-semibold text-ink">{it.stem}</p>
        {it.passage && (
          <details className="mt-1 text-xs text-muted">
            <summary className="cursor-pointer hover:text-ink">지문 보기</summary>
            <p className="mt-1 rounded-lg bg-panel px-3 py-2 leading-relaxed text-ink">{it.passage}</p>
          </details>
        )}
        <dl className="mt-2 grid grid-cols-[3.5rem_1fr] gap-y-1 text-xs">
          <dt className="text-muted">학생 답</dt>
          <dd className={cn('whitespace-pre-wrap', it.studentAnswer ? 'text-ink' : 'text-muted')}>{it.studentAnswer ?? '(무응답)'}</dd>
          <dt className="text-muted">{it.type === 'essay' ? '채점 기준' : '정답'}</dt>
          <dd className="text-brand-800">{it.correctAnswer}</dd>
        </dl>
      </div>
      <div className="col-start-2 sm:col-start-auto sm:text-right">
        {it.type === 'essay' && finished && it.studentAnswer
          ? <EssayScore attemptId={attemptId} it={it} onUpdated={onUpdated} />
          : <p className="text-sm font-bold text-ink tabular-nums">{it.score !== null ? `${num(it.score)}` : '-'}<span className="text-xs font-normal text-muted"> / {num(it.points)}점</span></p>}
      </div>
    </li>
  )
}

const num = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))

function Mark({ it, finished }: { it: AttemptItemResult; finished: boolean }) {
  let content: ReactNode = <span className="text-xs font-bold text-muted">{it.seq}</span>
  let tone = 'bg-track'
  if (finished && it.isCorrect === true) { content = <Check className="size-4" aria-label="정답" />; tone = 'bg-brand-50 text-brand-700' }
  else if (finished && it.score !== null && it.score > 0) { content = <span className="text-[10px] font-bold">부분</span>; tone = 'bg-wait/15 text-[#a16207]' }
  else if (finished && it.isCorrect === false) { content = <X className="size-4" aria-label="오답" />; tone = 'bg-alert/10 text-alert' }
  else if (finished) { content = <span className="text-[10px] font-bold">대기</span>; tone = 'bg-wait/15 text-[#a16207]' }
  return <span className={cn('flex size-9 items-center justify-center rounded-full', tone)}>{content}</span>
}

function EssayScore({ attemptId, it, onUpdated }: { attemptId: string; it: AttemptItemResult; onUpdated: (d: AttemptDetail) => void }) {
  const [value, setValue] = useState(it.score?.toString() ?? '')
  const mutation = useMutation({ mutationFn: (score: number) => scoreEssay(attemptId, it.itemId, score), onSuccess: onUpdated })
  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (value !== '') mutation.mutate(Number(value))
  }
  return (
    <form onSubmit={onSubmit} className="flex items-center gap-1 sm:justify-end">
      <label className="sr-only" htmlFor={`essay-${it.itemId}`}>{it.seq}번 점수</label>
      <input id={`essay-${it.itemId}`} type="number" inputMode="decimal" min={0} max={it.points} step={0.5} value={value}
        onChange={(e) => setValue(e.target.value)} placeholder="점수"
        className="h-8 w-16 rounded-lg border border-line px-2 text-right text-sm tabular-nums outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
      <span className="text-xs text-muted">/ {num(it.points)}</span>
      <button type="submit" disabled={value === '' || mutation.isPending}
        className="ml-1 flex h-8 items-center rounded-lg bg-navy px-2 text-xs font-bold text-white disabled:opacity-40">
        {mutation.isPending ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : '저장'}
      </button>
      {mutation.isError && <p role="alert" className="basis-full text-[11px] text-alert">{errorMessage(mutation.error)}</p>}
    </form>
  )
}
