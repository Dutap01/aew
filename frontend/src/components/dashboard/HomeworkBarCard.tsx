import { useReducedMotion } from 'motion/react'
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { Card, CardHeader } from '@/components/ui/Card'
import type { HomeworkDay } from '@/types/dashboard'
import { ChartTooltip } from './ChartTooltip'
import { CHART, axisTick } from './chartTheme'

interface HomeworkBarCardProps {
  data: HomeworkDay[]
  index?: number
}

interface TodayLabelProps {
  x?: number | string
  y?: number | string
  width?: number | string
  value?: unknown
  index?: number
}

export function HomeworkBarCard({ data, index }: HomeworkBarCardProps) {
  const reduced = useReducedMotion()
  const total = data.reduce((s, d) => s + d.submitted, 0)
  const todayIdx = data.findIndex((d) => d.isToday)

  /** 오늘 막대 위에만 값 말풍선을 항상 표시 */
  const renderTodayLabel = ({ x, y, width, value, index: i }: TodayLabelProps) => {
    if (i !== todayIdx) return null
    const cx = Number(x) + Number(width) / 2
    const top = Number(y) - 30
    return (
      <g pointerEvents="none">
        <rect x={cx - 20} y={top} width={40} height={22} rx={11} fill={CHART.navy} />
        <path d={`M${cx - 4} ${top + 22} L${cx} ${top + 27} L${cx + 4} ${top + 22} Z`} fill={CHART.navy} />
        <text x={cx} y={top + 15} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {String(value)}
        </text>
      </g>
    )
  }

  return (
    <Card index={index}>
      <CardHeader
        title="요일별 숙제 제출"
        description="이번 주 제출 건수"
        action={
          <span className="text-right">
            <span className="block text-lg font-extrabold leading-none tabular-nums text-ink">{total}</span>
            <span className="text-[10.5px] text-muted">건 / 주</span>
          </span>
        }
      />
      <div className="h-44" role="img" aria-label={`요일별 숙제 제출: ${data.map((d) => `${d.day} ${d.submitted}건`).join(', ')}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 34, right: 4, bottom: 0, left: 4 }} barCategoryGap="30%">
            <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} tickMargin={6} />
            <Tooltip
              cursor={false}
              content={({ active, payload, label }) => <ChartTooltip active={active} payload={payload} label={`${String(label)}요일`} unit="건" />}
            />
            <Bar
              dataKey="submitted"
              name="제출"
              radius={[10, 10, 10, 10]}
              maxBarSize={22}
              background={{ fill: CHART.track, radius: 10 }}
              isAnimationActive={!reduced}
              animationDuration={650}
            >
              {data.map((d) => (
                <Cell key={d.day} fill={d.isToday ? CHART.navy : CHART.brandSoft} />
              ))}
              <LabelList dataKey="submitted" content={renderTodayLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
