// 상담 달력 (대표·상담실장): 월간·주간 보기, 담당자 필터, 빈칸 클릭 → 새 일정, 일정 클릭 → 상세
// 보기 상태는 주소(?view=month|week&date=YYYY-MM-DD&counselor=ID)에 남긴다.
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { getAppointments, getCounselors } from '@/api/appointments'
import { AppointmentDetailDialog } from '@/components/appointment/AppointmentDetailDialog'
import { type AppointmentFormTarget, AppointmentFormDialog } from '@/components/appointment/AppointmentFormDialog'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import type { Appointment } from '@/types/appointment'
import { cn } from '@/utils/cn'
import {
  addDays, addMonths, DAY_NAMES, dayOfWeek, minutesToTime, monthGridDays, seoulParts, toSeoulIso, todaySeoul, weekDays,
} from '@/utils/seoulDate'

type View = 'month' | 'week'

const DAY_START = 9 * 60 // 주간 보기 09:00 ~ 22:00
const DAY_END = 22 * 60
const HOUR_PX = 64

const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)

/** 일정 색: 종류별, 끝난 일정은 흐리게 */
function eventTone(a: Appointment): string {
  if (a.status === 'canceled' || a.status === 'no_show') return 'bg-track text-muted line-through'
  const base = a.kind === 'level_test' ? 'bg-grape-50 text-grape border-grape' : 'bg-brand-50 text-brand-800 border-brand'
  return cn(base, 'border-l-[3px]', a.status === 'done' && 'opacity-55')
}

export function ConsultCalendarView() {
  const [params, setParams] = useSearchParams()
  const view: View = params.get('view') === 'week' ? 'week' : 'month'
  const date = isDate(params.get('date')) ? params.get('date')! : todaySeoul()
  const counselorId = params.get('counselor') ?? undefined
  const today = todaySeoul()

  const [formTarget, setFormTarget] = useState<AppointmentFormTarget | null>(null)
  const [selected, setSelected] = useState<Appointment | null>(null)

  function update(next: Partial<{ view: View; date: string; counselor: string | null }>) {
    const p = new URLSearchParams(params)
    if (next.view) p.set('view', next.view)
    if (next.date) p.set('date', next.date)
    if (next.counselor !== undefined) {
      if (next.counselor) p.set('counselor', next.counselor)
      else p.delete('counselor')
    }
    setParams(p, { replace: true })
  }

  const days = view === 'month' ? monthGridDays(date) : weekDays(date)
  const from = toSeoulIso(days[0], '00:00')
  const to = toSeoulIso(addDays(days[days.length - 1], 1), '00:00')

  const counselors = useQuery({ queryKey: ['counselors'], queryFn: getCounselors, staleTime: 5 * 60_000 })
  const query = useQuery({
    queryKey: ['appointments', { from, to, counselorId }],
    queryFn: () => getAppointments(from, to, counselorId),
    placeholderData: keepPreviousData,
  })

  // 날짜별로 묶기 (한국 날짜 기준)
  const byDate = new Map<string, Appointment[]>()
  for (const a of query.data ?? []) {
    const d = seoulParts(a.startsAt).date
    byDate.set(d, [...(byDate.get(d) ?? []), a])
  }

  const step = (dir: -1 | 1) => update({ date: view === 'month' ? addMonths(date, dir) : addDays(date, dir * 7) })
  const title = view === 'month'
    ? `${Number(date.slice(0, 4))}년 ${Number(date.slice(5, 7))}월`
    : `${days[0].slice(5).replace('-', '/')} ~ ${days[6].slice(5).replace('-', '/')}`
  const scheduledCount = (query.data ?? []).filter((a) => a.status === 'scheduled').length

  return (
    <>
      <Topbar title="상담 달력" subtitle={query.data ? `이 기간 예약 ${scheduledCount}건` : ' '} />

      <Card hoverLift={false} className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button type="button" aria-label={view === 'month' ? '이전 달' : '이전 주'} onClick={() => step(-1)}
            className="flex size-9 items-center justify-center rounded-xl text-ink hover:bg-track"><ChevronLeft className="size-4" /></button>
          <h2 className="min-w-32 text-center text-base font-extrabold text-ink tabular-nums" aria-live="polite">{title}</h2>
          <button type="button" aria-label={view === 'month' ? '다음 달' : '다음 주'} onClick={() => step(1)}
            className="flex size-9 items-center justify-center rounded-xl text-ink hover:bg-track"><ChevronRight className="size-4" /></button>
          <button type="button" onClick={() => update({ date: today })}
            className="ml-1 h-8 rounded-full bg-track px-3 text-xs font-semibold text-ink hover:bg-brand-50">오늘</button>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="counselor-filter">담당자</label>
          <select id="counselor-filter" value={counselorId ?? ''} onChange={(e) => update({ counselor: e.target.value || null })}
            className="h-9 rounded-xl border border-line bg-white px-3 text-xs font-semibold text-ink">
            <option value="">전체 담당자</option>
            {counselors.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex rounded-xl bg-track p-0.5" role="group" aria-label="보기">
            {(['month', 'week'] as View[]).map((v) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => update({ view: v })}
                className={cn('h-8 rounded-[10px] px-3 text-xs font-bold', view === v ? 'bg-white text-ink shadow-sm' : 'text-muted')}>
                {v === 'month' ? '월' : '주'}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setFormTarget({ mode: 'create', date: date < today ? today : date, time: '16:00' })}
            className="inline-flex h-9 items-center gap-1 rounded-xl bg-brand px-3.5 text-xs font-bold text-white hover:bg-brand-700">
            <Plus className="size-4" aria-hidden /> 일정 등록
          </button>
        </div>
      </Card>

      {query.isError && <p role="alert" className="mb-3 text-sm text-alert">일정을 불러오지 못했습니다.</p>}

      <Card hoverLift={false} index={1} className={cn('overflow-hidden p-0 transition-opacity', query.isPlaceholderData && 'opacity-60')}>
        {view === 'month' ? (
          <MonthGrid days={days} month={date.slice(0, 7)} today={today} byDate={byDate}
            onDay={(d) => setFormTarget({ mode: 'create', date: d, time: '16:00' })}
            onMore={(d) => update({ view: 'week', date: d })}
            onEvent={setSelected} />
        ) : (
          <WeekGrid days={days} today={today} byDate={byDate}
            onSlot={(d, t) => setFormTarget({ mode: 'create', date: d, time: t })}
            onEvent={setSelected} />
        )}
      </Card>

      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
        <Legend className="border-l-[3px] border-brand bg-brand-50">상담</Legend>
        <Legend className="border-l-[3px] border-grape bg-grape-50">레벨테스트</Legend>
        <Legend className="bg-brand-50 opacity-55">완료</Legend>
        <Legend className="bg-track line-through">취소·불참</Legend>
        <span>빈칸을 누르면 그 날짜·시간으로 일정을 등록합니다.</span>
      </p>

      <AppointmentDetailDialog appointment={selected} onClose={() => setSelected(null)} onChanged={setSelected}
        onEdit={(a) => { setSelected(null); setFormTarget({ mode: 'edit', appointment: a }) }} />
      <AppointmentFormDialog target={formTarget} onClose={() => setFormTarget(null)} />
    </>
  )
}

function Legend({ className, children }: { className: string; children: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={cn('inline-block h-3 w-5 rounded-sm', className)} aria-hidden />{children}</span>
}

interface MonthProps {
  days: string[]
  month: string
  today: string
  byDate: Map<string, Appointment[]>
  onDay: (date: string) => void
  onMore: (date: string) => void
  onEvent: (a: Appointment) => void
}

const MAX_IN_CELL = 3

function MonthGrid({ days, month, today, byDate, onDay, onMore, onEvent }: MonthProps) {
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[700px] grid-cols-7" role="grid" aria-label="월간 달력">
        {DAY_NAMES.map((n, i) => (
          <div key={n} role="columnheader" className={cn('border-b border-line py-2 text-center text-[11px] font-semibold',
            i === 0 ? 'text-alert' : i === 6 ? 'text-navy' : 'text-muted')}>{n}</div>
        ))}
        {days.map((d) => {
          const events = byDate.get(d) ?? []
          const inMonth = d.startsWith(month)
          const dow = dayOfWeek(d)
          return (
            <div key={d} role="gridcell" aria-label={`${Number(d.slice(5, 7))}월 ${Number(d.slice(8))}일, 일정 ${events.length}건`}
              onClick={() => onDay(d)}
              className={cn('group relative min-h-28 cursor-pointer border-b border-r border-line p-1.5 hover:bg-brand-50/40 [&:nth-child(7n)]:border-r-0',
                !inMonth && 'bg-panel/70')}>
              <span className={cn('mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                d === today ? 'bg-brand text-white' : !inMonth ? 'text-muted/60' : dow === 0 ? 'text-alert' : dow === 6 ? 'text-navy' : 'text-ink')}>
                {Number(d.slice(8))}
              </span>
              <div className="space-y-0.5">
                {events.slice(0, MAX_IN_CELL).map((a) => (
                  <button key={a.id} type="button" onClick={(e) => { e.stopPropagation(); onEvent(a) }}
                    className={cn('block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] leading-tight', eventTone(a))}>
                    <span className="tabular-nums">{seoulParts(a.startsAt).time}</span> {a.title}
                  </button>
                ))}
                {events.length > MAX_IN_CELL && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); onMore(d) }}
                    className="block w-full rounded px-1.5 text-left text-[11px] font-semibold text-muted hover:text-ink">
                    +{events.length - MAX_IN_CELL}건 더 보기
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface WeekProps {
  days: string[]
  today: string
  byDate: Map<string, Appointment[]>
  onSlot: (date: string, time: string) => void
  onEvent: (a: Appointment) => void
}

/** 시간이 겹치는 일정(다른 담당자)을 나란히 놓기: 겹치는 묶음마다 칸(lane)을 나눈다 */
function layoutDay(events: Appointment[]): { a: Appointment; start: number; end: number; lane: number; lanes: number }[] {
  const items = events
    .map((a) => {
      const start = seoulParts(a.startsAt).minutes
      const end = start + Math.max(20, (new Date(a.endsAt).getTime() - new Date(a.startsAt).getTime()) / 60000)
      return { a, start, end, lane: 0, lanes: 1 }
    })
    .sort((x, y) => x.start - y.start || y.end - x.end)
  let group: typeof items = []
  let groupEnd = -1
  const close = () => group.forEach((g) => (g.lanes = Math.max(...group.map((x) => x.lane)) + 1))
  for (const it of items) {
    if (it.start >= groupEnd) {
      close()
      group = []
    }
    const used = new Set(group.filter((g) => g.end > it.start).map((g) => g.lane))
    while (used.has(it.lane)) it.lane++
    group.push(it)
    groupEnd = Math.max(groupEnd, it.end)
  }
  close()
  return items
}

function WeekGrid({ days, today, byDate, onSlot, onEvent }: WeekProps) {
  const hours = Array.from({ length: (DAY_END - DAY_START) / 60 }, (_, i) => DAY_START + i * 60)
  const height = ((DAY_END - DAY_START) / 60) * HOUR_PX

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-line">
          <div />
          {days.map((d, i) => (
            <div key={d} className={cn('py-2 text-center text-xs font-semibold', i === 0 ? 'text-alert' : i === 6 ? 'text-navy' : 'text-ink')}>
              {DAY_NAMES[i]}{' '}
              <span className={cn('inline-flex size-6 items-center justify-center rounded-full tabular-nums', d === today && 'bg-brand text-white')}>
                {Number(d.slice(8))}
              </span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
          <div className="relative" style={{ height }}>
            {hours.map((h) => (
              <span key={h} className="absolute right-2 -translate-y-1/2 text-[10px] text-muted tabular-nums" style={{ top: ((h - DAY_START) / 60) * HOUR_PX }}>
                {h > DAY_START && minutesToTime(h)}
              </span>
            ))}
          </div>
          {days.map((d) => (
            <div key={d} className={cn('relative border-l border-line', d === today && 'bg-brand-50/30')} style={{ height }}
              onClick={(e) => {
                // 누른 위치를 30분 단위 시각으로
                const y = e.clientY - e.currentTarget.getBoundingClientRect().top
                const m = Math.min(DAY_END - 30, DAY_START + Math.floor(y / (HOUR_PX / 2)) * 30)
                onSlot(d, minutesToTime(m))
              }}>
              {hours.map((h) => (
                <div key={h} className="absolute inset-x-0 border-t border-line/70" style={{ top: ((h - DAY_START) / 60) * HOUR_PX }} aria-hidden />
              ))}
              {layoutDay(byDate.get(d) ?? []).map(({ a, start: s, end: e, lane, lanes }) => {
                const top = ((Math.max(s, DAY_START) - DAY_START) / 60) * HOUR_PX
                const h = ((Math.min(e, DAY_END) - Math.max(s, DAY_START)) / 60) * HOUR_PX
                if (h <= 0) return null
                return (
                  <button key={a.id} type="button" onClick={(ev) => { ev.stopPropagation(); onEvent(a) }}
                    className={cn('absolute overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[11px] leading-tight shadow-sm', eventTone(a))}
                    style={{ top, height: Math.max(h - 2, 18), left: `calc(${(lane / lanes) * 100}% + 2px)`, width: `calc(${100 / lanes}% - 4px)` }}>
                    {h < 40 ? (
                      // 짧은 일정: 한 줄로
                      <span className="block truncate"><span className="font-semibold tabular-nums">{seoulParts(a.startsAt).time}</span> {a.title}</span>
                    ) : (
                      <>
                        <span className="font-semibold tabular-nums">{seoulParts(a.startsAt).time}</span>
                        <span className="block truncate">{a.title}</span>
                        {h > 56 && a.counselorName && <span className="block truncate text-[10px] opacity-70">{a.counselorName}</span>}
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

