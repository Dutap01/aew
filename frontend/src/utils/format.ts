const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
})

export const formatToday = (date = new Date()) => dateFormatter.format(date)

export const formatNumber = (value: number) => value.toLocaleString('ko-KR')

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

/** 2026-11-25 → 11/25(수) */
export function formatShortDate(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${m}/${d}(${WEEKDAY[date.getDay()]})`
}

/** 학원 시간대. 기기 시간대 설정과 상관없이 한국 시각으로 표시한다 */
export const ACADEMY_TIME_ZONE = 'Asia/Seoul'

const seoulParts = new Intl.DateTimeFormat('en-US', {
  timeZone: ACADEMY_TIME_ZONE,
  month: 'numeric',
  day: 'numeric',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
const EN_WEEKDAY: Record<string, string> = { Sun: '일', Mon: '월', Tue: '화', Wed: '수', Thu: '목', Fri: '금', Sat: '토' }

/** ISO 시각 → 11/19(목) 14:05 (한국 시각) */
export function formatDateTime(iso: string): string {
  const parts = Object.fromEntries(seoulParts.formatToParts(new Date(iso)).map((p) => [p.type, p.value]))
  return `${parts.month}/${parts.day}(${EN_WEEKDAY[parts.weekday]}) ${parts.hour}:${parts.minute}`
}

/** 몇 분 전 / 몇 시간 전 / 날짜 */
export function formatRelative(iso: string, now = Date.now()): string {
  const diff = Math.floor((now - new Date(iso).getTime()) / 60000)
  if (diff < 1) return '방금'
  if (diff < 60) return `${diff}분 전`
  if (diff < 60 * 24) return `${Math.floor(diff / 60)}시간 전`
  if (diff < 60 * 24 * 7) return `${Math.floor(diff / 60 / 24)}일 전`
  return formatDateTime(iso).split(' ')[0]
}

/** YYYY-MM-DD (한국 날짜) */
export function toIsoDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(date)
}

const ISO_WEEKDAY = ['', '월', '화', '수', '목', '금', '토', '일']

/** ISO 요일 번호(1=월 … 7=일) → 월 */
export const weekdayName = (isoWeekday: number) => ISO_WEEKDAY[isoWeekday] ?? ''

/** "16:00:00" → "16:00" */
export const formatTime = (time: string) => time.slice(0, 5)
