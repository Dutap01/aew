// 달력 계산용 날짜 유틸. 날짜는 'YYYY-MM-DD' 문자열(한국 날짜)로 다루고, 시각은 한국 시각(+09:00)으로 주고받는다.
// 한국은 서머타임이 없어 +09:00 고정이다.

const KST_OFFSET = '+09:00'

const partsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** ISO 시각 → 한국 날짜·시각 { date: '2026-11-19', time: '14:05', minutes: 845 } */
export function seoulParts(iso: string): { date: string; time: string; minutes: number } {
  const p = Object.fromEntries(partsFormatter.formatToParts(new Date(iso)).map((x) => [x.type, x.value]))
  const time = `${p.hour}:${p.minute}`
  return { date: `${p.year}-${p.month}-${p.day}`, time, minutes: Number(p.hour) * 60 + Number(p.minute) }
}

/** '2026-11-19' + '14:00' → '2026-11-19T14:00:00+09:00' */
export const toSeoulIso = (date: string, time: string) => `${date}T${time}:00${KST_OFFSET}`

/** 오늘 (한국 날짜) */
export const todaySeoul = () => seoulParts(new Date().toISOString()).date

/** UTC 자정 기준 Date 로 바꿔 날짜만 계산 (시간대 영향 없음) */
const toUtc = (date: string) => {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}
const fromUtc = (d: Date) => d.toISOString().slice(0, 10)

export function addDays(date: string, days: number): string {
  const d = toUtc(date)
  d.setUTCDate(d.getUTCDate() + days)
  return fromUtc(d)
}

/** 0=일 … 6=토 */
export const dayOfWeek = (date: string) => toUtc(date).getUTCDay()

/** 그 주의 일요일 */
export const startOfWeek = (date: string) => addDays(date, -dayOfWeek(date))

export const startOfMonth = (date: string) => `${date.slice(0, 7)}-01`

export function addMonths(date: string, months: number): string {
  const d = toUtc(startOfMonth(date))
  d.setUTCMonth(d.getUTCMonth() + months)
  return fromUtc(d)
}

/** 월간 달력 칸: 그 달 1일이 있는 주의 일요일부터 6주(42일) */
export function monthGridDays(date: string): string[] {
  const first = startOfWeek(startOfMonth(date))
  return Array.from({ length: 42 }, (_, i) => addDays(first, i))
}

export const weekDays = (date: string) => Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(date), i))

/** 분 → 'HH:mm' */
export const minutesToTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

export const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']
