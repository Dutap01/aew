import { TrendingUp } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardHeader } from '@/components/ui/Card'
import type { EnrollmentSummary } from '@/types/dashboard'
import { ChartTooltip } from './ChartTooltip'
import { CHART, axisTick } from './chartTheme'

interface EnrollmentCardProps {
  data: EnrollmentSummary
  index?: number
}

export function EnrollmentCard({ data, index }: EnrollmentCardProps) {
  const reduced = useReducedMotion()
  const values = data.history.map((h) => h.students)
  const min = Math.min(...values)
  const max = Math.max(...values)
  // 상단 여백을 크게 잡아 그래프는 아래쪽, 큰 숫자는 가운데에 놓이게 한다
  const domain: [number, number] = [Math.max(0, min - (max - min) * 0.4), max + (max - min) * 1.4]

  return (
    <Card index={index} className="overflow-hidden p-0">
      <div className="px-5 pt-5">
        <CardHeader title="재원 현황" description="월별 재원생 추이와 상담 → 등록 전환율" className="mb-3" />
        <dl className="grid grid-cols-2 divide-x divide-line">
          <div className="pr-4">
            <dt className="text-[11px] text-muted">재원생</dt>
            <dd className="mt-0.5 text-[28px] font-extrabold leading-tight tabular-nums text-ink">
              {data.totalStudents}
              <span className="ml-1 text-sm font-semibold text-muted">명</span>
            </dd>
          </div>
          <div className="pl-5">
            <dt className="text-[11px] text-muted">이번 달 신규</dt>
            <dd className="mt-0.5 text-[28px] font-extrabold leading-tight tabular-nums text-ink">
              {data.newThisMonth}
              <span className="ml-1 text-sm font-semibold text-muted">명</span>
            </dd>
          </div>
        </dl>
      </div>

      <div className="relative mt-2 h-48" role="img" aria-label={`월별 재원생: ${data.history.map((h) => `${h.month} ${h.students}명`).join(', ')}`}>
        <div className="pointer-events-none absolute inset-x-0 top-[14%] z-10 flex flex-col items-center">
          <span className="text-[40px] font-extrabold leading-none tracking-tight tabular-nums text-ink">
            {data.conversionRate.toFixed(1)}
            <span className="text-2xl">%</span>
          </span>
          <span className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-muted">
            등록 전환율
            <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-50 px-1.5 py-0.5 text-[10.5px] font-bold text-brand-800 tabular-nums">
              <TrendingUp className="size-3" aria-hidden />+{data.conversionDelta}%p
            </span>
          </span>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.history} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="enrollment-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART.brand} stopOpacity={0.35} />
                <stop offset="100%" stopColor={CHART.brand} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <YAxis hide domain={domain} />
            <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} padding={{ left: 20, right: 20 }} height={26} />
            <Tooltip
              cursor={{ stroke: CHART.navy, strokeOpacity: 0.3, strokeDasharray: '4 4' }}
              content={({ active, payload, label }) => <ChartTooltip active={active} payload={payload} label={label} unit="명" />}
            />
            <Area
              type="monotone"
              dataKey="students"
              name="재원생"
              stroke={CHART.brand}
              strokeWidth={2.25}
              fill="url(#enrollment-fill)"
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
              isAnimationActive={!reduced}
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
