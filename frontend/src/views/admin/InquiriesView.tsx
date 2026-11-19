// 상담·레벨테스트 접수 목록 (대표·상담실장). 검색 조건은 주소(?q=&status=&type=&page=)에 남긴다.
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, ExternalLink, Inbox, LoaderCircle, Search, UserCheck, X } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { getInquiryCounts, searchInquiries } from '@/api/inquiries'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import { INQUIRY_STATUS_LABEL, INQUIRY_TYPE_LABEL, InquiryStatusBadge, InquiryTypeBadge } from '@/components/ui/InquiryBadges'
import type { InquiryStatus, InquiryType } from '@/types/inquiry'
import { cn } from '@/utils/cn'
import { formatNumber, formatRelative, formatShortDate } from '@/utils/format'
import { useDebouncedValue } from '@/utils/useDebouncedValue'

const PAGE_SIZE = 20
const STATUSES: InquiryStatus[] = ['received', 'contacted', 'scheduled', 'completed', 'canceled']
const TYPES: InquiryType[] = ['consult', 'level_test']

const asStatus = (v: string | null) => (v && v in INQUIRY_STATUS_LABEL ? (v as InquiryStatus) : undefined)
const asType = (v: string | null) => (v && v in INQUIRY_TYPE_LABEL ? (v as InquiryType) : undefined)

export function InquiriesView() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const status = asStatus(params.get('status'))
  const type = asType(params.get('type'))
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

  function update(key: 'status' | 'type' | 'page', value: string | null) {
    const next = new URLSearchParams(params)
    if (value === null) next.delete(key)
    else next.set(key, value)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }

  const list = useQuery({
    queryKey: ['inquiries', { q, status, type, page }],
    queryFn: () => searchInquiries({ q, status, type, page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })
  const counts = useQuery({
    queryKey: ['inquiries', 'counts', { q, type }],
    queryFn: () => getInquiryCounts({ q, type }),
    placeholderData: keepPreviousData,
  })
  const data = list.data
  const totalAll = counts.data ? STATUSES.reduce((sum, s) => sum + counts.data[s], 0) : undefined
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  return (
    <>
      <Topbar
        title="상담·테스트 접수"
        subtitle={counts.data ? `처리 대기 ${formatNumber(counts.data.received)}건 · 예약확정 ${formatNumber(counts.data.scheduled)}건` : ' '}
      />

      <Card hoverLift={false} className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 md:flex-row">
          <label className="relative block flex-1">
            <span className="sr-only">접수 검색</span>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              id="inquiry-search"
              type="search"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="학생·신청자 이름, 학교, 연락처 뒷자리"
              className="h-11 w-full rounded-xl border border-line bg-white pr-10 pl-10 text-sm text-ink outline-none placeholder:text-muted/80 focus:border-brand focus:ring-2 focus:ring-brand/20 [&::-webkit-search-cancel-button]:hidden"
            />
            {list.isFetching ? (
              <LoaderCircle className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-muted" aria-label="검색 중" />
            ) : input ? (
              <button type="button" onClick={() => setInput('')} aria-label="검색어 지우기"
                className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-track hover:text-ink">
                <X className="size-4" />
              </button>
            ) : null}
          </label>
          <div className="flex gap-1.5" role="group" aria-label="신청 종류">
            {[undefined, ...TYPES].map((t) => (
              <Chip key={t ?? 'all'} active={type === t} onClick={() => update('type', t ?? null)}>
                {t ? INQUIRY_TYPE_LABEL[t] : '전체 종류'}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="처리 상태">
          <Chip active={!status} onClick={() => update('status', null)}>
            전체 {totalAll !== undefined && <Count n={totalAll} active={!status} />}
          </Chip>
          {STATUSES.map((s) => (
            <Chip key={s} active={status === s} onClick={() => update('status', s)}>
              {INQUIRY_STATUS_LABEL[s]} {counts.data && <Count n={counts.data[s]} active={status === s} />}
            </Chip>
          ))}
        </div>
      </Card>

      <Card hoverLift={false} index={1} className="overflow-hidden p-0">
        {list.isError ? (
          <p role="alert" className="p-6 text-sm text-alert">접수 목록을 불러오지 못했습니다.</p>
        ) : !data ? (
          <div className="space-y-3 p-5" aria-hidden>
            {Array.from({ length: 8 }, (_, i) => <div key={i} className="h-6 animate-pulse rounded-lg bg-track" />)}
          </div>
        ) : data.items.length === 0 ? (
          <div className="flex min-h-60 flex-col items-center justify-center gap-2 text-center">
            <Inbox className="size-8 text-muted" aria-hidden />
            <p className="text-sm font-bold text-ink">해당하는 접수가 없습니다</p>
          </div>
        ) : (
          <div className={cn('overflow-x-auto transition-opacity', list.isPlaceholderData && 'opacity-60')}>
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-line bg-panel/60 text-[11px] font-semibold tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3">접수</th>
                  <th scope="col" className="px-3 py-3">종류</th>
                  <th scope="col" className="px-3 py-3">학생</th>
                  <th scope="col" className="px-3 py-3">신청자 · 연락처</th>
                  <th scope="col" className="px-3 py-3">희망 일정</th>
                  <th scope="col" className="px-5 py-3">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((r) => (
                  <tr key={r.id} onClick={() => navigate(`/admin/inquiries/${r.id}`)}
                    className="cursor-pointer transition-colors hover:bg-brand-50/50">
                    <td className="px-5 py-3 text-xs text-muted tabular-nums whitespace-nowrap">{formatRelative(r.createdAt)}</td>
                    <td className="px-3 py-3"><InquiryTypeBadge type={r.type} /></td>
                    <td className="px-3 py-3">
                      <Link to={`/admin/inquiries/${r.id}`} onClick={(e) => e.stopPropagation()}
                        className="font-bold text-ink hover:text-brand-700 hover:underline">
                        {r.studentName}
                      </Link>
                      {r.studentId && <UserCheck className="ml-1 inline size-3.5 text-brand" aria-label="학생 등록됨" />}
                      <span className="ml-1.5 text-xs text-muted">{[r.school, r.grade].filter(Boolean).join(' · ')}</span>
                    </td>
                    <td className="px-3 py-3 text-ink">
                      {r.applicantName} <span className="text-xs text-muted tabular-nums">{r.applicantPhone}</span>
                    </td>
                    <td className="px-3 py-3 text-ink tabular-nums whitespace-nowrap">
                      {r.preferredSlots[0] ? `${formatShortDate(r.preferredSlots[0].date)} ${r.preferredSlots[0].time}` : '-'}
                      {r.preferredSlots.length > 1 && <span className="ml-1 text-xs text-muted">외 {r.preferredSlots.length - 1}</span>}
                    </td>
                    <td className="px-5 py-3"><InquiryStatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.total > 0 && (
          <nav aria-label="페이지" className="flex items-center justify-between border-t border-line px-5 py-3 text-xs text-muted">
            <span className="tabular-nums">총 {formatNumber(data.total)}건</span>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="이전 페이지" disabled={page === 0} onClick={() => update('page', String(page - 1))}
                className="flex size-8 items-center justify-center rounded-lg text-ink hover:bg-track disabled:opacity-30">
                <ChevronLeft className="size-4" />
              </button>
              <span className="min-w-14 text-center font-semibold text-ink tabular-nums">{page + 1} / {totalPages}</span>
              <button type="button" aria-label="다음 페이지" disabled={page + 1 >= totalPages} onClick={() => update('page', String(page + 1))}
                className="flex size-8 items-center justify-center rounded-lg text-ink hover:bg-track disabled:opacity-30">
                <ChevronRight className="size-4" />
              </button>
            </div>
          </nav>
        )}
      </Card>

      <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        학부모에게 보낼 신청서 주소:
        <a href="/apply/consult" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
          /apply/consult <ExternalLink className="size-3" aria-hidden />
        </a>
        <a href="/apply/level-test" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
          /apply/level-test <ExternalLink className="size-3" aria-hidden />
        </a>
      </p>
    </>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold whitespace-nowrap transition-colors',
        active ? 'bg-brand text-white' : 'bg-track text-ink hover:bg-brand-50 hover:text-brand-800')}>
      {children}
    </button>
  )
}

function Count({ n, active }: { n: number; active: boolean }) {
  return <span className={cn('tabular-nums', active ? 'text-white/80' : 'text-muted')}>{formatNumber(n)}</span>
}
