// 학생 목록·검색 (대표·상담실장). 검색어·상태·페이지는 주소(?q=&status=&page=)에 남겨 새로고침·뒤로가기에도 유지한다.
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, LoaderCircle, Search, UserPlus, UserRoundX, X } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { searchStudents } from '@/api/students'
import { Topbar } from '@/components/layout/Topbar'
import { StudentFormDialog } from '@/components/student/StudentFormDialog'
import { Card } from '@/components/ui/Card'
import { STUDENT_STATUS_LABEL, StudentStatusBadge } from '@/components/ui/StudentStatusBadge'
import type { StudentStatus } from '@/types/student'
import { cn } from '@/utils/cn'
import { formatNumber } from '@/utils/format'
import { useDebouncedValue } from '@/utils/useDebouncedValue'

const PAGE_SIZE = 20
const STATUS_FILTERS: (StudentStatus | 'all')[] = ['all', 'enrolled', 'consulting', 'test_scheduled', 'paused', 'withdrawn']

function isStatus(value: string | null): value is StudentStatus {
  return value !== null && value in STUDENT_STATUS_LABEL
}

export function StudentsView() {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [params, setParams] = useSearchParams()
  const status = isStatus(params.get('status')) ? (params.get('status') as StudentStatus) : undefined
  const page = Math.max(0, Number(params.get('page') ?? 0) || 0)

  // 입력창은 즉시 반영, 주소·요청은 입력이 멈춘 뒤 반영
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

  const query = useQuery({
    queryKey: ['students', { q, status, page }],
    queryFn: () => searchStudents({ q, status, page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })
  const data = query.data
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1
  const from = data && data.total > 0 ? page * PAGE_SIZE + 1 : 0
  const to = data ? Math.min(data.total, (page + 1) * PAGE_SIZE) : 0

  return (
    <>
      <Topbar title="학생" subtitle={data ? `검색 결과 ${formatNumber(data.total)}명` : ' '} hideSearch />

      <Card hoverLift={false} className="mb-4 space-y-3">
        <div className="flex items-center gap-2">
          <label className="relative block flex-1">
            <span className="sr-only">학생 검색</span>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              id="student-search"
              type="search"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="이름, 학생 코드(S-0001), 학교, 학부모 연락처 뒷자리"
              className="h-11 w-full rounded-xl border border-line bg-white pr-10 pl-10 text-sm text-ink outline-none placeholder:text-muted/80 focus:border-brand focus:ring-2 focus:ring-brand/20 [&::-webkit-search-cancel-button]:hidden"
              autoFocus
            />
            {query.isFetching ? (
              <LoaderCircle className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-muted" aria-label="검색 중" />
            ) : input ? (
              <button
                type="button"
                onClick={() => setInput('')}
                aria-label="검색어 지우기"
                className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-track hover:text-ink"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </label>
          <button type="button" onClick={() => setCreating(true)} aria-label="학생 등록"
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-brand px-4 text-sm font-bold text-white hover:bg-brand-700">
            <UserPlus className="size-4" aria-hidden /> <span className="hidden sm:inline">학생 등록</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="상태 필터">
          {STATUS_FILTERS.map((s) => {
            const active = (s === 'all' && !status) || s === status
            return (
              <button
                key={s}
                type="button"
                aria-pressed={active}
                onClick={() => update('status', s === 'all' ? null : s)}
                className={cn(
                  'h-8 rounded-full px-3 text-xs font-semibold transition-colors',
                  active ? 'bg-brand text-white' : 'bg-track text-ink hover:bg-brand-50 hover:text-brand-800',
                )}
              >
                {s === 'all' ? '전체' : STUDENT_STATUS_LABEL[s]}
              </button>
            )
          })}
        </div>
      </Card>

      <Card hoverLift={false} index={1} className="overflow-hidden p-0">
        {query.isError ? (
          <p role="alert" className="p-6 text-sm text-alert">
            학생 목록을 불러오지 못했습니다: {(query.error as Error).message}
          </p>
        ) : !data ? (
          <TableSkeleton />
        ) : data.items.length === 0 ? (
          <div className="flex min-h-60 flex-col items-center justify-center gap-2 text-center">
            <UserRoundX className="size-8 text-muted" aria-hidden />
            <p className="text-sm font-bold text-ink">검색 결과가 없습니다</p>
            <p className="text-xs text-muted">이름 일부, 학생 코드 숫자, 연락처 뒷자리 4자리로도 찾을 수 있습니다.</p>
          </div>
        ) : (
          <div className={cn('overflow-x-auto transition-opacity', query.isPlaceholderData && 'opacity-60')}>
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line bg-panel/60 text-[11px] font-semibold tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3">학생 코드</th>
                  <th scope="col" className="px-3 py-3">이름</th>
                  <th scope="col" className="px-3 py-3">학교 · 학년</th>
                  <th scope="col" className="px-3 py-3">반</th>
                  <th scope="col" className="px-3 py-3">상태</th>
                  <th scope="col" className="px-5 py-3">학부모 연락처</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((s) => (
                  <tr key={s.id} className="transition-colors hover:bg-brand-50/50">
                    <td className="px-5 py-3 font-mono text-xs text-muted tabular-nums">{s.studentCode}</td>
                    <td className="px-3 py-3">
                      <Link to={`/admin/students/${s.id}`} className="font-bold text-ink hover:text-brand-700 hover:underline">
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-ink">
                      {[s.school, s.grade].filter(Boolean).join(' · ') || <span className="text-muted">-</span>}
                    </td>
                    <td className="px-3 py-3 text-ink">
                      {s.classes.length ? s.classes.join(', ') : <span className="text-muted">-</span>}
                    </td>
                    <td className="px-3 py-3">
                      <StudentStatusBadge status={s.status} />
                    </td>
                    <td className="px-5 py-3 text-ink tabular-nums">{s.parentPhone ?? <span className="text-muted">-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.total > 0 && (
          <nav aria-label="페이지" className="flex items-center justify-between border-t border-line px-5 py-3 text-xs text-muted">
            <span className="tabular-nums">
              {formatNumber(from)}–{formatNumber(to)} / {formatNumber(data.total)}명
            </span>
            <div className="flex items-center gap-1">
              <PageButton label="이전 페이지" disabled={page === 0} onClick={() => update('page', String(page - 1))}>
                <ChevronLeft className="size-4" />
              </PageButton>
              <span className="min-w-14 text-center font-semibold text-ink tabular-nums">
                {page + 1} / {totalPages}
              </span>
              <PageButton label="다음 페이지" disabled={page + 1 >= totalPages} onClick={() => update('page', String(page + 1))}>
                <ChevronRight className="size-4" />
              </PageButton>
            </div>
          </nav>
        )}
      </Card>

      <StudentFormDialog open={creating} onClose={() => setCreating(false)} onSaved={(s) => navigate(`/admin/students/${s.id}`)} />
    </>
  )
}

function PageButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-lg text-ink hover:bg-track disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-3 p-5" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="h-6 animate-pulse rounded-lg bg-track" />
      ))}
    </div>
  )
}
