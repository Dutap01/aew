interface TooltipItem {
  name?: unknown
  value?: unknown
  color?: string
  dataKey?: unknown
}

interface ChartTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<TooltipItem>
  label?: unknown
  unit?: string
}

/** 공통 차트 툴팁 — 값은 본문 잉크색, 색은 옆의 점으로만 표시 */
export function ChartTooltip({ active, payload, label, unit = '' }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="min-w-28 rounded-xl border border-line bg-white/95 px-3 py-2 text-xs shadow-card-hover backdrop-blur">
      {label != null && label !== '' && <p className="mb-1 font-semibold text-muted">{String(label)}</p>}
      <ul className="space-y-0.5">
        {payload.map((item, i) => (
          <li key={String(item.dataKey ?? i)} className="flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ background: item.color }} aria-hidden />
            <span className="text-muted">{String(item.name ?? '')}</span>
            <span className="ml-auto pl-3 font-bold tabular-nums text-ink">
              {typeof item.value === 'number' ? item.value.toLocaleString('ko-KR') : String(item.value ?? '')}
              {unit}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
