import { useReducedMotion } from 'motion/react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardHeader } from '@/components/ui/Card'
import type { ClassComposition, GradeSlice } from '@/types/dashboard'
import { ChartTooltip } from './ChartTooltip'
import { CHART } from './chartTheme'

const GRADE_COLOR: Record<GradeSlice['grade'], string> = {
  중1: CHART.brand,
  중2: CHART.grape,
  중3: CHART.navy,
}

interface ClassDonutCardProps {
  data: ClassComposition
  index?: number
}

export function ClassDonutCard({ data, index }: ClassDonutCardProps) {
  const reduced = useReducedMotion()
  const total = data.slices.reduce((s, x) => s + x.students, 0)

  return (
    <Card index={index}>
      <CardHeader title="반 구성" description="학년별 재원생 비율" />

      <div className="flex items-center gap-5">
        <div className="relative size-36 shrink-0" role="img" aria-label={data.slices.map((s) => `${s.grade} ${s.students}명`).join(', ')}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.slices}
                dataKey="students"
                nameKey="grade"
                innerRadius="68%"
                outerRadius="100%"
                paddingAngle={2}
                cornerRadius={4}
                stroke="#fff"
                strokeWidth={2}
                startAngle={90}
                endAngle={-270}
                isAnimationActive={!reduced}
                animationDuration={700}
              >
                {data.slices.map((s) => (
                  <Cell key={s.grade} fill={GRADE_COLOR[s.grade]} />
                ))}
              </Pie>
              <Tooltip content={({ active, payload }) => <ChartTooltip active={active} payload={payload} unit="명" />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[22px] font-extrabold leading-none tabular-nums text-ink">{total}</span>
            <span className="mt-1 text-[10.5px] text-muted">명</span>
          </div>
        </div>

        <ul className="min-w-0 flex-1 space-y-2.5">
          {data.slices.map((s) => {
            const pct = total ? Math.round((s.students / total) * 1000) / 10 : 0
            return (
              <li key={s.grade} className="flex items-center gap-2 text-xs">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: GRADE_COLOR[s.grade] }} aria-hidden />
                <span className="font-semibold text-ink">{s.grade}</span>
                <span className="ml-auto tabular-nums text-muted">{s.students}명</span>
                <span className="w-11 text-right font-bold tabular-nums text-ink">{pct}%</span>
              </li>
            )
          })}
        </ul>
      </div>

      <dl className="mt-5 grid grid-cols-2 divide-x divide-line rounded-xl bg-panel py-3">
        <div className="px-4">
          <dt className="text-[11px] text-muted">재원생</dt>
          <dd className="mt-0.5 text-lg font-extrabold tabular-nums text-ink">
            {data.totalStudents}
            <span className="ml-0.5 text-xs font-semibold text-muted">명</span>
          </dd>
        </div>
        <div className="px-4">
          <dt className="text-[11px] text-muted">이번 달 신규 등록</dt>
          <dd className="mt-0.5 text-lg font-extrabold tabular-nums text-brand-700">
            +{data.newThisMonth}
            <span className="ml-0.5 text-xs font-semibold text-muted">명</span>
          </dd>
        </div>
      </dl>
    </Card>
  )
}
