// 학생: 레벨테스트 응시. 시작 전 안내 → 응시(답은 고르는 즉시 자동 저장, 타이머) → 제출.
// 시간이 끝나면 저장된 답으로 자동 제출한다. 창을 닫았다가 다시 열어도 저장된 답이 그대로 남는다.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, Clock, LoaderCircle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { getMyAttempt, saveAnswer, startMyAttempt, submitMyAttempt } from '@/api/attempts'
import { ApiError } from '@/api/client'
import { errorMessage } from '@/api/errors'
import { Card } from '@/components/ui/Card'
import type { Question, StudentAttempt } from '@/types/test'
import { cn } from '@/utils/cn'

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧']
const TEXT_SAVE_DELAY = 700

type Answer = { choice: number | null; text: string }
type SaveState = 'saving' | 'saved' | 'error'

export function TakeTestView() {
  const { attemptId = '' } = useParams()
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['my-attempt', attemptId], queryFn: () => getMyAttempt(attemptId), refetchOnWindowFocus: false })
  const setData = (a: StudentAttempt) => {
    queryClient.setQueryData(['my-attempt', attemptId], a)
    queryClient.invalidateQueries({ queryKey: ['my-attempts'] })
  }

  if (query.isError) {
    return <Card hoverLift={false}><p role="alert" className="text-sm text-alert">{errorMessage(query.error, '테스트를 불러오지 못했습니다.')}</p><BackToList /></Card>
  }
  const a = query.data
  if (!a) return <div className="h-96 animate-pulse rounded-card bg-white" aria-label="불러오는 중" />
  if (a.status === 'issued') return <Intro a={a} onStarted={setData} />
  if (a.status === 'in_progress') return <Exam key={a.id} a={a} onSubmitted={setData} onExpired={() => query.refetch()} />
  return <Done a={a} />
}

function BackToList() {
  return (
    <Link to="/s/test" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink">
      <ArrowLeft className="size-3.5" aria-hidden /> 레벨테스트 목록
    </Link>
  )
}

function Intro({ a, onStarted }: { a: StudentAttempt; onStarted: (a: StudentAttempt) => void }) {
  const start = useMutation({ mutationFn: () => startMyAttempt(a.id), onSuccess: onStarted })
  return (
    <Card hoverLift={false} className="mx-auto max-w-xl text-center">
      <p className="mb-1 text-xs font-semibold text-brand-700">레벨테스트</p>
      <h1 className="text-2xl font-extrabold text-ink">{a.testTitle}</h1>
      <p className="mt-2 text-sm text-muted">{a.itemCount}문항 · {a.timeLimitMinutes ? `제한 시간 ${a.timeLimitMinutes}분` : '시간 제한 없음'}</p>
      <ul className="mx-auto my-6 max-w-sm space-y-2 text-left text-sm text-ink">
        <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />답은 고르거나 쓰는 즉시 자동으로 저장됩니다.</li>
        {a.timeLimitMinutes && <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />시작하면 시간이 흐르고, 시간이 끝나면 자동으로 제출됩니다.</li>}
        <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />모르는 문제는 비워 두고 넘어가도 됩니다.</li>
        <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />제출한 뒤에는 답을 고칠 수 없습니다.</li>
      </ul>
      <button type="button" disabled={start.isPending} onClick={() => start.mutate()}
        className="inline-flex h-12 w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-brand text-base font-bold text-white hover:bg-brand-700 disabled:opacity-50">
        {start.isPending && <LoaderCircle className="size-5 animate-spin" aria-hidden />} 시작하기
      </button>
      {start.isError && <p role="alert" className="mt-3 text-sm text-alert">{errorMessage(start.error)}</p>}
      <div><BackToList /></div>
    </Card>
  )
}

function Done({ a }: { a: StudentAttempt }) {
  return (
    <Card hoverLift={false} className="mx-auto flex max-w-xl flex-col items-center gap-3 py-10 text-center">
      <CheckCircle2 className="size-12 text-brand" aria-hidden />
      <h1 className="text-xl font-extrabold text-ink">제출했습니다</h1>
      <p className="text-sm text-muted">{a.testTitle}<br />수고했어요! 결과는 학원에서 안내해 드립니다.</p>
      <BackToList />
    </Card>
  )
}

/** 남은 시간 (초). 기한이 없으면 null */
function useRemaining(deadline: string | null): number | null {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!deadline) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [deadline])
  return deadline ? Math.max(0, Math.floor((new Date(deadline).getTime() - now) / 1000)) : null
}

function Exam({ a, onSubmitted, onExpired }: { a: StudentAttempt; onSubmitted: (a: StudentAttempt) => void; onExpired: () => void }) {
  const [answers, setAnswers] = useState<Record<string, Answer>>(() =>
    Object.fromEntries(a.items.map((q) => [q.itemId, { choice: q.savedChoice, text: q.savedText ?? '' }])))
  const [saveState, setSaveState] = useState<Record<string, SaveState>>({})
  const timers = useRef(new Map<string, number>())
  const pending = useRef(new Map<string, Promise<void>>())
  /** 저장에 실패한 문항 (제출 전에 다시 저장) */
  const failed = useRef(new Set<string>())
  const answersRef = useRef(answers)
  useEffect(() => { answersRef.current = answers }, [answers])
  const remaining = useRemaining(a.deadline)
  const answered = a.items.filter((q) => isAnswered(q, answers[q.itemId])).length

  const persist = useCallback((q: Question, value: Answer) => {
    setSaveState((s) => ({ ...s, [q.itemId]: 'saving' }))
    const body = q.type === 'choice' ? { choice: value.choice } : { text: value.text.trim() ? value.text : null }
    const p = saveAnswer(a.id, q.itemId, body)
      .then(() => { failed.current.delete(q.itemId); setSaveState((s) => ({ ...s, [q.itemId]: 'saved' })) })
      .catch((e) => {
        failed.current.add(q.itemId)
        setSaveState((s) => ({ ...s, [q.itemId]: 'error' }))
        // 시간이 끝나 저장이 막히면 서버가 저장된 답으로 제출하므로 다시 불러온다
        if (e instanceof ApiError && e.status === 409) onExpired()
      })
      .finally(() => pending.current.delete(q.itemId))
    pending.current.set(q.itemId, p)
  }, [a.id, onExpired])

  function change(q: Question, value: Answer) {
    setAnswers((s) => ({ ...s, [q.itemId]: value }))
    window.clearTimeout(timers.current.get(q.itemId))
    if (q.type === 'choice') {
      persist(q, value)
    } else {
      // 글자는 입력이 멈추면 저장
      timers.current.set(q.itemId, window.setTimeout(() => { timers.current.delete(q.itemId); persist(q, value) }, TEXT_SAVE_DELAY))
    }
  }

  /** 저장 대기 중인 글자 답과 저장에 실패했던 답을 바로 저장하고, 모든 저장이 끝날 때까지 기다린다 */
  const flush = useCallback(async () => {
    const ids = new Set([...timers.current.keys(), ...failed.current])
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current.clear()
    for (const itemId of ids) {
      const q = a.items.find((x) => x.itemId === itemId)
      if (q) persist(q, answersRef.current[itemId])
    }
    await Promise.allSettled([...pending.current.values()])
  }, [a.items, persist])

  const submit = useMutation({
    mutationFn: async () => { await flush(); return submitMyAttempt(a.id) },
    onSuccess: onSubmitted,
    onError: (e) => { if (e instanceof ApiError && e.status === 409) onExpired() },
  })

  // 시간이 끝나면 자동 제출 (한 번만)
  const autoSubmitted = useRef(false)
  useEffect(() => {
    if (remaining === 0 && !autoSubmitted.current) {
      autoSubmitted.current = true
      submit.mutate()
    }
  }, [remaining, submit])

  function onSubmitClick() {
    const left = a.items.length - answered
    if (!window.confirm(left > 0 ? `아직 ${left}문항을 풀지 않았습니다. 그래도 제출할까요?` : '제출할까요? 제출하면 답을 고칠 수 없습니다.')) return
    submit.mutate()
  }

  const warn = remaining !== null && remaining <= 300

  return (
    <div className="mx-auto max-w-3xl">
      {/* 위에 고정: 남은 시간, 푼 문항, 제출 */}
      <div className="sticky top-2 z-20 -mx-1 mb-4 rounded-2xl bg-white/95 px-4 py-3 shadow-card backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink">{a.testTitle}</p>
            <p className="text-xs text-muted tabular-nums">푼 문항 {answered} / {a.items.length}</p>
          </div>
          {remaining !== null && (
            <span className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold tabular-nums', warn ? 'bg-alert/10 text-alert' : 'bg-track text-ink')}
              role="timer" aria-label="남은 시간">
              <Clock className="size-4" aria-hidden /> {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
            </span>
          )}
          <button type="button" onClick={onSubmitClick} disabled={submit.isPending}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand px-4 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50">
            {submit.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden />} 제출
          </button>
        </div>
        <nav aria-label="문항 바로가기" className="mt-2.5 flex flex-wrap gap-1">
          {a.items.map((q) => (
            <a key={q.itemId} href={`#q-${q.seq}`}
              className={cn('flex size-7 items-center justify-center rounded-md text-[11px] font-bold tabular-nums',
                isAnswered(q, answers[q.itemId]) ? 'bg-brand text-white' : 'bg-track text-muted hover:text-ink')}>
              {q.seq}
            </a>
          ))}
        </nav>
        {warn && remaining! > 0 && <p className="mt-2 text-xs font-semibold text-alert">5분 남았습니다. 시간이 끝나면 자동으로 제출됩니다.</p>}
        {submit.isError && <p role="alert" className="mt-2 text-xs text-alert">{errorMessage(submit.error)}</p>}
      </div>

      <ol className="space-y-4">
        {a.items.map((q, i) => {
          const prev = a.items[i - 1]
          return (
            <li key={q.itemId} id={`q-${q.seq}`} className="scroll-mt-40">
              {q.passage && q.passage !== prev?.passage && (
                <div className="mb-3 rounded-2xl border border-line bg-panel px-5 py-4 text-[15px] leading-relaxed text-ink">
                  <p className="mb-1 text-xs font-bold text-muted">다음 글을 읽고 물음에 답하시오.</p>
                  {q.passage}
                </div>
              )}
              <QuestionCard q={q} value={answers[q.itemId]} state={saveState[q.itemId]} onChange={(v) => change(q, v)} />
            </li>
          )
        })}
      </ol>

      <div className="my-8 text-center">
        <button type="button" onClick={onSubmitClick} disabled={submit.isPending}
          className="inline-flex h-12 w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-brand text-base font-bold text-white hover:bg-brand-700 disabled:opacity-50">
          {submit.isPending && <LoaderCircle className="size-5 animate-spin" aria-hidden />} 제출하기
        </button>
      </div>
    </div>
  )
}

function isAnswered(q: Question, v: Answer | undefined): boolean {
  if (!v) return false
  return q.type === 'choice' ? v.choice !== null : v.text.trim() !== ''
}

function QuestionCard({ q, value, state, onChange }: { q: Question; value: Answer; state?: SaveState; onChange: (v: Answer) => void }) {
  const name = `q-${q.itemId}`
  return (
    <fieldset className="rounded-2xl bg-white px-5 py-4 shadow-card">
      <legend className="sr-only">{q.seq}번 문제</legend>
      <div className="mb-3 flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">{q.seq}</span>
        <p className="flex-1 pt-0.5 text-[15px] font-semibold text-ink">{q.stem}</p>
        <SaveMark state={state} />
      </div>
      {q.type === 'choice' ? (
        <div className="space-y-1.5 sm:pl-10" role="radiogroup">
          {q.choices.map((c, i) => {
            const n = i + 1
            const checked = value.choice === n
            return (
              <label key={i} className={cn('flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 ring-1 transition-colors',
                checked ? 'bg-brand-50 ring-brand' : 'ring-line hover:bg-panel')}>
                <input type="radio" name={name} checked={checked} onChange={() => onChange({ ...value, choice: n })} className="sr-only" />
                <span className={cn('text-base', checked ? 'text-brand-700' : 'text-muted')} aria-hidden>{CIRCLED[i] ?? n}</span>
                <span className="text-[15px] text-ink">{c}</span>
              </label>
            )
          })}
        </div>
      ) : q.type === 'short' ? (
        <div className="sm:pl-10">
          <input type="text" value={value.text} onChange={(e) => onChange({ ...value, text: e.target.value })} maxLength={200}
            autoComplete="off" autoCapitalize="off" spellCheck={false} aria-label={`${q.seq}번 답`} placeholder="답을 쓰세요"
            className="h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
        </div>
      ) : (
        <div className="sm:pl-10">
          <textarea rows={5} value={value.text} onChange={(e) => onChange({ ...value, text: e.target.value })} maxLength={2000}
            spellCheck={false} aria-label={`${q.seq}번 답`} placeholder="답을 쓰세요"
            className="w-full rounded-xl border border-line bg-white px-3.5 py-3 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
        </div>
      )}
    </fieldset>
  )
}

function SaveMark({ state }: { state?: SaveState }) {
  if (!state) return null
  if (state === 'saving') return <span className="flex items-center gap-1 text-[11px] text-muted"><LoaderCircle className="size-3 animate-spin" aria-hidden />저장 중</span>
  if (state === 'error') return <span role="alert" className="flex items-center gap-1 text-[11px] font-semibold text-alert"><AlertTriangle className="size-3" aria-hidden />저장 실패</span>
  return <span className="flex items-center gap-1 text-[11px] text-brand-700"><Check className="size-3" aria-hidden />저장됨</span>
}
