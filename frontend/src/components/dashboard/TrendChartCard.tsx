import { useReducedMotion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardHeader } from '@/components/ui/Card'
import { Toggle, type ToggleOption } from '@/components/ui/Toggle'
import type { TrendPeriod, TrendSeries } from '@/types/dashboard'
import { ChartTooltip } from './ChartTooltip'
import { CHART, axisTick } from './chartTheme'

type ChartKind = 'line' | 'bar'

const PERIOD_OPTIONS: ToggleOption<TrendPeriod>[] = [
  { value: 'day', label: '일' },
  { value: 'week', label: '주' },
  { value: 'month', label: '월' },
  { value: 'all', label: '전체' },
]

const KIND_OPTIONS: ToggleOption<ChartKind>[] = [
  { value: 'line', label: 'Line' },
  { value: 'bar', label: 'Bar' },
]

const SERIES = [
  { key: 'consultations', name: '신규 상담', color: CHART.brand },
  { key: 'levelTests', name: '레벨테스트', color: CHART.grape },
] as const

interface TrendChartCardProps {
  data: TrendSeries
  index?: number
}

export function TrendChartCard({ data, index }: TrendChartCardProps) {
  const reduced = useReducedMotion()
  const [period, setPeriod] = useState<TrendPeriod>('week')
  const [kind, setKind] = useState<ChartKind>('line')
  const points = data[period]

  const totals = useMemo(
    () => ({
      consultations: points.reduce((s, p) => s + p.consultations, 0),
      levelTests: points.reduce((s, p) => s + p.levelTests, 0),
    }),
    [points],
  )

  const common = {
    data: points,
    margin: { top: 8, right: 6, bottom: 0, left: -18 },
  }
  const axes = (
    <>
      <CartesianGrid vertical={false} stroke={CHART.grid} />
      <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} tickMargin={8} interval="preserveStartEnd" minTickGap={12} />
      <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} allowDecimals={false} />
    </>
  )

  return (
    <Card index={index}>
      <CardHeader
        title="상담·레벨테스트 추이"
        description="신규 상담 접수와 레벨테스트 응시 건수"
        action={<Toggle ariaLabel="차트 종류" variant="subtle" size="xs" options={KIND_OPTIONS} value={kind} onChange={setKind} />}
        className="mb-3"
      />

      {/* 범례 */}
      <ul className="mb-2 flex flex-wrap gap-x-5 gap-y-1">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5 text-xs">
            <span className="h-2 w-3.5 rounded-full" style={{ background: s.color }} aria-hidden />
            <span className="text-muted">{s.name}</span>
            <span className="font-bold tabular-nums text-ink">{totals[s.key].toLocaleString('ko-KR')}</span>
          </li>
        ))}
      </ul>

      <div className="h-56" role="img" aria-label={`기간별 신규 상담 ${totals.consultations}건, 레벨테스트 ${totals.levelTests}건 추이`}>
        <ResponsiveContainer width="100%" height="100%">
          {kind === 'line' ? (
            <LineChart {...common}>
              {axes}
              <Tooltip
                cursor={{ stroke: CHART.navy, strokeOpacity: 0.35, strokeDasharray: '4 4' }}
                content={({ active, payload, label }) => <ChartTooltip active={active} payload={payload} label={label} unit="건" />}
              />
              {SERIES.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={2.25}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                  isAnimationActive={!reduced}
                  animationDuration={700}
                />
              ))}
            </LineChart>
          ) : (
            <BarChart {...common} barGap={2} barCategoryGap="28%">
              {axes}
              <Tooltip
                cursor={{ fill: CHART.track, radius: 6 }}
                content={({ active, payload, label }) => <ChartTooltip active={active} payload={payload} label={label} unit="건" />}
              />
              {SERIES.map((s) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.name}
                  fill={s.color}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                  isAnimationActive={!reduced}
                  animationDuration={600}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
        <span className="text-[11px] text-muted">기간</span>
        <Toggle ariaLabel="기간" options={PERIOD_OPTIONS} value={period} onChange={setPeriod} size="xs" />
      </div>
    </Card>
  )
}
