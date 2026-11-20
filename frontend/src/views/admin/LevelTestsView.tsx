// 레벨테스트 결과 (대표·상담실장): 응시 목록. 상태 탭·학생 검색·페이지는 주소(?status=&q=&page=)에 남긴다.
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, ClipboardX, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { getAttemptCounts, searchAttempts } from '@/api/attempts'
import { errorMessage } from '@/api/errors'
import { Topbar } from '@/components/layout/Topbar'
import { ATTEMPT_STATUS_LABEL, AttemptStatusBadge, formatScore } from '@/components/test/AttemptStatusBadge'
import { Card } from '@/components/ui/Card'
import type { AttemptCounts, AttemptStatus } from '@/types/test'
import { cn } from '@/utils/cn'
import { formatDateTime } from '@/utils/format'
import { useDebouncedValue } from '@/utils/useDebouncedValue'

const PAGE_SIZE = 20
const TABS: (AttemptStatus | 'all')[] = ['all', 'submitted', 'graded', 'in_progress', 'issued']
const COUNT_KEY: Record<AttemptStatus, keyof AttemptCounts> = {
  issued: 'issued', in_progress: 'inProgress', submitted: 'submitted', graded: 'graded',
}
const isStatus = (v: string | null): v is AttemptStatus => v !== null && v in ATTEMPT_STATUS_LABEL

export function LevelTestsView() {
  const [params, setParams] = useSearchParams()
  const status = isStatus(params.get('status')) ? (params.get('status') as AttemptStatus) : undefined
  const page = Math.max(0, Number(params.get('page') ?? 0) || 0)
  const [input, setInput] = useState(params.get('q') ?? '')
  const q = useDebouncedValue(input.trim())

  useEffect(() => {
    if ((params.get('q') ?? '') === q) return
    const next = new URLSearchParams(params)
    if (q) next.set('q', q)
    else next.delete('q')
    next.delete('page')
    setParams(next, { replace: true })
  }, [q, params, setParams])

  function update(key: 'status' | 'page', value: string | null) {
    const next = new URLSearchParams(params)
    if (value === null) next.delete(key)
    else next.set(key, value)
    if (key === 'status') next.delete('page')
    setParams(next)
  }

  const list = useQuery({
    queryKey: ['attempts', { q, status, page }],
    queryFn: () => searchAttempts({ q, status, page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })
  const counts = useQuery({ queryKey: ['attempts', 'counts', q], queryFn: () => getAttemptCounts(q) })
  const total = counts.data ? Object.values(counts.data).reduce((a, b) => a + b, 0) : undefined
  const data = list.data
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  return (
    <>
      <Topbar title="레벨테스트 결과" subtitle={counts.data ? `채점대기 ${counts.data.submitted}건 · 응시중 ${counts.data.inProgress}건` : ' '} />

      <Card hoverLift={false} className="mb-4 space-y-3">
        <label className="relative block">
          <span className="sr-only">학생 검색</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input type="search" value={input} onChange={(e) => setInput(e.target.value)} placeholder="학생 이름, 학생 코드"
            className="h-11 w-full rounded-xl border border-line bg-white pr-4 pl-10 text-sm text-ink outline-none placeholder:text-muted/80 focus:border-brand focus:ring-2 focus:ring-brand/20" />
        </label>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="상태">
          {TABS.map((t) => {
            const active = (t === 'all' && !status) || t === status
            const n = t === 'all' ? total : counts.data?.[COUNT_KEY[t]]
            return (
              <button key={t} type="button" aria-pressed={active} onClick={() => update('status', t === 'all' ? null : t)}
                className={cn('h-8 rounded-full px-3 text-xs font-semibold transition-colors',
                  active ? 'bg-brand text-white' : 'bg-track text-ink hover:bg-brand-50 hover:text-brand-800')}>
                {t === 'all' ? '전체' : ATTEMPT_STATUS_LABEL[t]}
                {n !== undefined && <span className={cn('ml-1 tabular-nums', active ? 'opacity-80' : 'text-muted')}>{n}</span>}
              </button>
            )
          })}
        </div>
      </Card>

      <Card hoverLift={false} index={1} className="overflow-hidden p-0">
        {list.isError ? (
          <p role="alert" className="p-6 text-sm text-alert">{errorMessage(list.error, '목록을 불러오지 못했습니다.')}</p>
        ) : !data ? (
          <div className="h-80 animate-pulse bg-white" />
        ) : data.items.length === 0 ? (
          <div className="flex min-h-60 flex-col items-center justify-center gap-2 text-center">
            <ClipboardX className="size-8 text-muted" aria-hidden />
            <p className="text-sm font-bold text-ink">응시 기록이 없습니다</p>
            <p className="text-xs text-muted">학생 화면이나 레벨테스트 접수에서 '레벨테스트 발급'을 누르세요.</p>
          </div>
        ) : (
          <div className={cn('overflow-x-auto transition-opacity', list.isPlaceholderData && 'opacity-60')}>
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-line bg-panel/60 text-[11px] font-semibold text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3">학생</th>
                  <th scope="col" className="px-3 py-3">테스트</th>
                  <th scope="col" className="px-3 py-3">상태</th>
                  <th scope="col" className="px-3 py-3 text-right">점수</th>
                  <th scope="col" className="px-3 py-3">발급</th>
                  <th scope="col" className="px-5 py-3">제출</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((a) => (
                  <tr key={a.id} className="hover:bg-brand-50/50">
                    <td className="px-5 py-3">
                      <Link to={`/admin/level-tests/${a.id}`} className="font-bold text-ink hover:text-brand-700 hover:underline">{a.studentName}</Link>
                      <span className="ml-1.5 font-mono text-[11px] text-muted">{a.studentCode}</span>
                      {a.grade && <span className="ml-1.5 text-xs text-muted">{a.grade}</span>}
                    </td>
                    <td className="px-3 py-3 text-ink">{a.testTitle}</td>
                    <td className="px-3 py-3"><AttemptStatusBadge status={a.status} /></td>
                    <td className="px-3 py-3 text-right font-semibold text-ink tabular-nums">
                      {a.status === 'graded' || a.status === 'submitted' ? formatScore(a.score, a.maxScore) : <span className="font-normal text-muted">-</span>}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted tabular-nums">{formatDateTime(a.issuedAt)}{a.issuedByName && ` · ${a.issuedByName}`}</td>
                    <td className="px-5 py-3 text-xs text-muted tabular-nums">{a.submittedAt ? formatDateTime(a.submittedAt) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.total > PAGE_SIZE && (
          <nav aria-label="페이지" className="flex items-center justify-end gap-1 border-t border-line px-5 py-3 text-xs">
            <button type="button" aria-label="이전 페이지" disabled={page === 0} onClick={() => update('page', String(page - 1))}
              className="flex size-8 items-center justify-center rounded-lg hover:bg-track disabled:opacity-30"><ChevronLeft className="size-4" /></button>
            <span className="min-w-14 text-center font-semibold tabular-nums">{page + 1} / {totalPages}</span>
            <button type="button" aria-label="다음 페이지" disabled={page + 1 >= totalPages} onClick={() => update('page', String(page + 1))}
              className="flex size-8 items-center justify-center rounded-lg hover:bg-track disabled:opacity-30"><ChevronRight className="size-4" /></button>
          </nav>
        )}
      </Card>
    </>
  )
}
