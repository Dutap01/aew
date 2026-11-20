// 개인 주간 시간표 (월~일). 넓은 화면은 요일×시간 격자, 좁은 화면은 요일별 목록.
// 주말 칸은 주말 수업이 있을 때만 보인다. 반마다 색을 고정해 같은 반을 한눈에 알아보게 한다.
import { ChevronLeft, ChevronRight, CalendarX2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { Timetable, TimetableEntry } from '@/types/timetable'
import { cn } from '@/utils/cn'
import { formatShortDate, formatTime, weekdayName } from '@/utils/format'
import { addDays, dayOfWeek, minutesToTime, todaySeoul } from '@/utils/seoulDate'

const HOUR_PX = 60

/** 반 색 (반 id 순서대로 돌려 쓴다) */
const TONES = [
  'bg-brand-50 text-brand-900 border-brand',
  'bg-grape-50 text-[#5b34c7] border-grape',
  'bg-sky-soft text-navy border-navy',
  'bg-wait/15 text-[#8a5300] border-wait',
  'bg-brand-100 text-brand-900 border-brand-700',
  'bg-track text-ink border-muted',
]

/** 그 날짜가 있는 주의 월요일 */
export function mondayOf(date: string): string {
  return addDays(date, -((dayOfWeek(date) + 6) % 7))
}

const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))

interface Props {
  /** 보고 있는 주의 월요일 */
  week: string
  onWeekChange: (monday: string) => void
  data?: Timetable
  isLoading?: boolean
  error?: ReactNode
  /** 수업 칸 아래 줄: 학생 시간표는 강사 이름, 강사 시간표는 학생 수 */
  secondLine?: (e: TimetableEntry) => string | null
  /** 반 이름을 누르면 갈 곳 (운영자 화면) */
  classHref?: (e: TimetableEntry) => string
  emptyText?: string
}

export function WeekTimetable({ week, onWeekChange, data, isLoading, error, secondLine, classHref, emptyText = '이번 주 수업이 없습니다.' }: Props) {
  const today = todaySeoul()
  const entries = data?.entries ?? []
  const minutes = entries.reduce((sum, e) => sum + toMinutes(e.endTime) - toMinutes(e.startTime), 0)

  // 반 색: 반 id 를 정렬해 순서대로
  const classIds = [...new Set(entries.map((e) => e.classId))].sort()
  const tone = (e: TimetableEntry) => TONES[classIds.indexOf(e.classId) % TONES.length]

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <div className="flex items-center gap-1">
          <NavButton label="이전 주" onClick={() => onWeekChange(addDays(week, -7))}><ChevronLeft className="size-4" /></NavButton>
          <button type="button" onClick={() => onWeekChange(mondayOf(today))} disabled={week === mondayOf(today)}
            className="h-8 rounded-lg px-2.5 text-xs font-semibold whitespace-nowrap text-ink hover:bg-track disabled:text-muted disabled:hover:bg-transparent">
            이번 주
          </button>
          <NavButton label="다음 주" onClick={() => onWeekChange(addDays(week, 7))}><ChevronRight className="size-4" /></NavButton>
        </div>
        <h3 className="text-sm font-bold whitespace-nowrap text-ink tabular-nums">
          {formatShortDate(week)} ~ {formatShortDate(addDays(week, 6))}
        </h3>
        {data && entries.length > 0 && (
          <p className="ml-auto text-xs text-muted tabular-nums">
            주 {entries.length}회 · {Math.floor(minutes / 60)}시간{minutes % 60 ? ` ${minutes % 60}분` : ''}
          </p>
        )}
      </div>

      {error ? (
        <p role="alert" className="rounded-xl bg-alert/10 px-3 py-6 text-center text-sm text-alert">{error}</p>
      ) : isLoading || !data ? (
        <div className="h-96 animate-pulse rounded-xl bg-track" aria-label="불러오는 중" />
      ) : entries.length === 0 ? (
        <div className="flex min-h-56 flex-col items-center justify-center gap-2 rounded-xl bg-panel text-center">
          <CalendarX2 className="size-7 text-muted" aria-hidden />
          <p className="text-sm text-muted">{emptyText}</p>
        </div>
      ) : (
        <>
          <Grid week={week} today={today} entries={entries} tone={tone} secondLine={secondLine} classHref={classHref} />
          <DayList week={week} today={today} entries={entries} tone={tone} secondLine={secondLine} classHref={classHref} />
        </>
      )}
    </div>
  )
}

function NavButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick}
      className="flex size-8 items-center justify-center rounded-lg text-ink hover:bg-track">
      {children}
    </button>
  )
}

interface ViewProps {
  week: string
  today: string
  entries: TimetableEntry[]
  tone: (e: TimetableEntry) => string
  secondLine?: (e: TimetableEntry) => string | null
  classHref?: (e: TimetableEntry) => string
}

/** 같은 요일에 시간이 겹치는 수업은 나란히 (칸 나누기) */
function lanes(dayEntries: TimetableEntry[]) {
  const placed: { e: TimetableEntry; lane: number; lanes: number }[] = []
  let group: typeof placed = []
  let groupEnd = -1
  const flush = () => { const n = Math.max(...group.map((g) => g.lane)) + 1; group.forEach((g) => (g.lanes = n)); group = [] }
  for (const e of dayEntries) {
    const start = toMinutes(e.startTime)
    if (start >= groupEnd && group.length) flush()
    const used = new Set(group.filter((g) => toMinutes(g.e.endTime) > start).map((g) => g.lane))
    let lane = 0
    while (used.has(lane)) lane++
    const item = { e, lane, lanes: 1 }
    group.push(item)
    placed.push(item)
    groupEnd = Math.max(groupEnd, toMinutes(e.endTime))
  }
  if (group.length) flush()
  return placed
}

function Grid({ week, today, entries, tone, secondLine, classHref }: ViewProps) {
  const hasWeekend = entries.some((e) => e.weekday >= 6)
  const days = Array.from({ length: hasWeekend ? 7 : 5 }, (_, i) => i + 1)
  // 보이는 시간: 가장 이른 수업 시작 ~ 가장 늦은 수업 끝 (정시로 맞춤)
  const start = Math.floor(Math.min(...entries.map((e) => toMinutes(e.startTime))) / 60) * 60
  const end = Math.ceil(Math.max(...entries.map((e) => toMinutes(e.endTime))) / 60) * 60
  const hours = Array.from({ length: (end - start) / 60 + 1 }, (_, i) => start + i * 60)
  const height = ((end - start) / 60) * HOUR_PX

  return (
    <div className="hidden overflow-x-auto md:block">
      <div className={cn(hasWeekend ? 'min-w-[720px]' : 'min-w-[560px]')}>
        <div className="grid border-b border-line" style={{ gridTemplateColumns: `3.25rem repeat(${days.length}, minmax(0, 1fr))` }}>
          <div />
          {days.map((d) => {
            const date = addDays(week, d - 1)
            return (
              <div key={d} className={cn('py-2 text-center text-xs font-semibold', d === 7 ? 'text-alert' : d === 6 ? 'text-navy' : 'text-ink')}>
                {weekdayName(d)}{' '}
                <span className={cn('inline-flex size-6 items-center justify-center rounded-full tabular-nums', date === today && 'bg-brand text-white')}>
                  {Number(date.slice(8))}
                </span>
              </div>
            )
          })}
        </div>
        <div className="grid pt-2 pb-3" style={{ gridTemplateColumns: `3.25rem repeat(${days.length}, minmax(0, 1fr))` }}>
          <div className="relative" style={{ height }}>
            {hours.map((h) => (
              <span key={h} className="absolute right-2 -translate-y-1/2 text-[10px] text-muted tabular-nums" style={{ top: ((h - start) / 60) * HOUR_PX }}>
                {minutesToTime(h)}
              </span>
            ))}
          </div>
          {days.map((d) => {
            const date = addDays(week, d - 1)
            return (
              <div key={d} className={cn('relative border-l border-line', date === today && 'bg-brand-50/40')} style={{ height }}>
                {hours.map((h) => (
                  <div key={h} className="absolute inset-x-0 border-t border-line/70" style={{ top: ((h - start) / 60) * HOUR_PX }} aria-hidden />
                ))}
                {lanes(entries.filter((e) => e.weekday === d)).map(({ e, lane, lanes: n }) => {
                  const top = ((toMinutes(e.startTime) - start) / 60) * HOUR_PX
                  const h = ((toMinutes(e.endTime) - toMinutes(e.startTime)) / 60) * HOUR_PX
                  const sub = secondLine?.(e)
                  return (
                    <div key={`${e.classId}-${e.startTime}`}
                      className={cn('absolute overflow-hidden rounded-lg border-l-[3px] px-2 py-1 text-[11px] leading-snug', tone(e))}
                      style={{ top: top + 1, height: Math.max(h - 2, 20), left: `calc(${(lane / n) * 100}% + 3px)`, width: `calc(${100 / n}% - 6px)` }}>
                      <ClassName e={e} href={classHref} className="block truncate text-xs font-bold" />
                      <span className="block truncate tabular-nums opacity-80">{formatTime(e.startTime)}~{formatTime(e.endTime)}</span>
                      {sub && h >= 56 && <span className="block truncate opacity-80">{sub}</span>}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** 좁은 화면: 수업 있는 요일만 목록으로 */
function DayList({ week, today, entries, tone, secondLine, classHref }: ViewProps) {
  const days = [...new Set(entries.map((e) => e.weekday))].sort((a, b) => a - b)
  return (
    <ol className="space-y-4 md:hidden">
      {days.map((d) => {
        const date = addDays(week, d - 1)
        return (
          <li key={d}>
            <p className={cn('mb-1.5 text-xs font-bold', date === today ? 'text-brand-700' : 'text-ink')}>
              {formatShortDate(date)}{date === today && ' · 오늘'}
            </p>
            <ul className="space-y-1.5">
              {entries.filter((e) => e.weekday === d).map((e) => {
                const sub = secondLine?.(e)
                return (
                  <li key={`${e.classId}-${e.startTime}`} className={cn('flex items-center gap-3 rounded-xl border-l-[3px] px-3 py-2.5', tone(e))}>
                    <span className="w-24 shrink-0 text-xs font-semibold tabular-nums">{formatTime(e.startTime)}~{formatTime(e.endTime)}</span>
                    <span className="min-w-0 flex-1">
                      <ClassName e={e} href={classHref} className="block truncate text-sm font-bold" />
                      {sub && <span className="block truncate text-xs opacity-80">{sub}</span>}
                    </span>
                  </li>
                )
              })}
            </ul>
          </li>
        )
      })}
    </ol>
  )
}

function ClassName({ e, href, className }: { e: TimetableEntry; href?: (e: TimetableEntry) => string; className: string }) {
  return href
    ? <Link to={href(e)} className={cn(className, 'hover:underline')}>{e.className}</Link>
    : <span className={className}>{e.className}</span>
}
