// 발송 이력 (대표·상담실장): 학부모에게 보낸(보낼) 안내 문자, 상태, 재발송.
// 5초마다 새로 불러와 대기 → 성공/실패 바뀌는 것을 바로 볼 수 있다.
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, FlaskConical, Inbox, RotateCw, Search, X } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { errorMessage } from '@/api/errors'
import { getNotificationCounts, resendNotification, searchNotifications } from '@/api/notifications'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import type { Notification, NotificationStatus } from '@/types/notification'
import { cn } from '@/utils/cn'
import { formatDateTime, formatNumber, formatRelative } from '@/utils/format'
import { useDebouncedValue } from '@/utils/useDebouncedValue'

const PAGE_SIZE = 20
const REFRESH_MS = 5000

const STATUS_LABEL: Record<NotificationStatus, string> = { queued: '대기', sending: '발송 중', succeeded: '성공', failed: '실패' }
const STATUS_TONE: Record<NotificationStatus, string> = {
  queued: 'bg-wait/15 text-[#a16207]',
  sending: 'bg-sky-soft text-navy',
  succeeded: 'bg-brand-50 text-brand-800',
  failed: 'bg-alert/10 text-alert',
}
const STATUSES: NotificationStatus[] = ['queued', 'sending', 'succeeded', 'failed']
const asStatus = (v: string | null) => (v && v in STATUS_LABEL ? (v as NotificationStatus) : undefined)

export function NotificationsView() {
  const [params, setParams] = useSearchParams()
  const status = asStatus(params.get('status'))
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
    if (key !== 'page') next.delete('page')
    setParams(next)
  }

  const list = useQuery({
    queryKey: ['notifications', { q, status, page }],
    queryFn: () => searchNotifications({ q, status, page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
    refetchInterval: REFRESH_MS,
  })
  const counts = useQuery({
    queryKey: ['notifications', 'counts', q],
    queryFn: () => getNotificationCounts(q),
    placeholderData: keepPreviousData,
    refetchInterval: REFRESH_MS,
  })
  const c = counts.data
  const data = list.data
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  return (
    <>
      <Topbar title="발송 이력" subtitle={c ? `성공 ${formatNumber(c.succeeded)} · 실패 ${formatNumber(c.failed)} · 대기 ${formatNumber(c.queued + c.sending)}` : ' '} />

      {c?.sender === 'mock' && (
        <div role="note" className="mb-4 flex items-start gap-2.5 rounded-card bg-grape-50 px-4 py-3 text-xs text-grape">
          <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            <b>가짜 발송 모드</b> — 실제 문자는 나가지 않고 여기에만 기록됩니다. 번호 끝자리가 <b>0000</b>이면 실패를 흉내 내어
            자동 재시도(최대 3회) 후 실패로 남습니다.
          </p>
        </div>
      )}

      <Card hoverLift={false} className="mb-4 space-y-3">
        <label className="relative block">
          <span className="sr-only">발송 이력 검색</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input id="notification-search" type="search" value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="받는 번호 뒷자리, 학생 이름 등 내용"
            className="h-11 w-full rounded-xl border border-line bg-white pr-10 pl-10 text-sm text-ink outline-none placeholder:text-muted/80 focus:border-brand focus:ring-2 focus:ring-brand/20 [&::-webkit-search-cancel-button]:hidden" />
          {input && (
            <button type="button" onClick={() => setInput('')} aria-label="검색어 지우기"
              className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-track hover:text-ink">
              <X className="size-4" />
            </button>
          )}
        </label>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="발송 상태">
          <Chip active={!status} onClick={() => update('status', null)}>전체</Chip>
          {STATUSES.map((s) => (
            <Chip key={s} active={status === s} onClick={() => update('status', s)}>
              {STATUS_LABEL[s]} {c && <span className={cn('tabular-nums', status === s ? 'text-white/80' : 'text-muted')}>{formatNumber(c[s])}</span>}
            </Chip>
          ))}
        </div>
      </Card>

      <Card hoverLift={false} index={1} className="p-0">
        {list.isError ? (
          <p role="alert" className="p-6 text-sm text-alert">발송 이력을 불러오지 못했습니다.</p>
        ) : !data ? (
          <div className="space-y-3 p-5" aria-hidden>{Array.from({ length: 5 }, (_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-track" />)}</div>
        ) : data.items.length === 0 ? (
          <div className="flex min-h-60 flex-col items-center justify-center gap-2 text-center">
            <Inbox className="size-8 text-muted" aria-hidden />
            <p className="text-sm font-bold text-ink">발송 이력이 없습니다</p>
            <p className="text-xs text-muted">상담 일정을 잡거나 변경·취소하면 학부모 안내가 여기에 쌓입니다.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {data.items.map((n) => <Row key={n.id} n={n} />)}
          </ul>
        )}
        {data && data.total > 0 && (
          <nav aria-label="페이지" className="flex items-center justify-between border-t border-line px-5 py-3 text-xs text-muted">
            <span className="tabular-nums">총 {formatNumber(data.total)}건</span>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="이전 페이지" disabled={page === 0} onClick={() => update('page', String(page - 1))}
                className="flex size-8 items-center justify-center rounded-lg text-ink hover:bg-track disabled:opacity-30"><ChevronLeft className="size-4" /></button>
              <span className="min-w-14 text-center font-semibold text-ink tabular-nums">{page + 1} / {totalPages}</span>
              <button type="button" aria-label="다음 페이지" disabled={page + 1 >= totalPages} onClick={() => update('page', String(page + 1))}
                className="flex size-8 items-center justify-center rounded-lg text-ink hover:bg-track disabled:opacity-30"><ChevronRight className="size-4" /></button>
            </div>
          </nav>
        )}
      </Card>
    </>
  )
}

function Row({ n }: { n: Notification }) {
  const queryClient = useQueryClient()
  const resend = useMutation({
    mutationFn: () => resendNotification(n.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })
  const canResend = n.status === 'failed' || n.status === 'succeeded'

  return (
    <li className="flex flex-col gap-2 px-5 py-4 md:flex-row md:items-start md:gap-4" data-notification-id={n.id}>
      <div className="w-36 shrink-0 text-xs text-muted">
        <p className="font-semibold text-ink tabular-nums" title={formatDateTime(n.createdAt)}>{formatRelative(n.createdAt)}</p>
        <p className="tabular-nums">{n.toPhone}</p>
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex h-6 items-center rounded-full bg-track px-2.5 text-[11px] font-semibold text-ink">{n.templateLabel}</span>
          <span className={cn('inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold', STATUS_TONE[n.status])}>{STATUS_LABEL[n.status]}</span>
          {n.inquiryId && <Link to={`/admin/inquiries/${n.inquiryId}`} className="text-[11px] font-semibold text-brand-700 hover:underline">접수 보기</Link>}
        </div>
        <p className="text-sm text-ink">{n.body}</p>
        <p className="mt-1 text-[11px] text-muted">
          시도 {n.attempts}회
          {n.sentAt && <> · 발송 {formatDateTime(n.sentAt)}</>}
          {n.status === 'queued' && n.attempts > 0 && <> · 다음 시도 {formatDateTime(n.nextAttemptAt)}</>}
          {n.error && <> · <span className="text-alert">{n.error}</span></>}
        </p>
        {resend.isError && <p role="alert" className="mt-1 text-xs text-alert">{errorMessage(resend.error)}</p>}
      </div>
      {canResend && (
        <button type="button" disabled={resend.isPending}
          onClick={() => { if (n.status === 'failed' || window.confirm('같은 내용을 한 번 더 보낼까요?')) resend.mutate() }}
          className={cn('inline-flex h-8 shrink-0 items-center gap-1 self-start rounded-lg px-2.5 text-xs font-bold disabled:opacity-50',
            n.status === 'failed' ? 'bg-alert text-white hover:opacity-90' : 'bg-track text-ink hover:bg-line')}>
          <RotateCw className="size-3.5" aria-hidden /> {n.status === 'failed' ? '재발송' : '다시 보내기'}
        </button>
      )}
    </li>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors',
        active ? 'bg-brand text-white' : 'bg-track text-ink hover:bg-brand-50 hover:text-brand-800')}>
      {children}
    </button>
  )
}
