import { motion, useReducedMotion } from 'motion/react'
import { Avatar } from '@/components/ui/Avatar'
import { Card, CardHeader } from '@/components/ui/Card'
import type { TeacherStat } from '@/types/dashboard'
import { CHART } from './chartTheme'

const AVATAR_COLORS = ['bg-brand', 'bg-grape', 'bg-navy', 'bg-brand-700']
const RING = 52
const STROKE = 3
const R = (RING - STROKE) / 2
const C = 2 * Math.PI * R

interface TeacherActivityProps {
  teachers: TeacherStat[]
  index?: number
}

export function TeacherActivity({ teachers, index }: TeacherActivityProps) {
  const reduced = useReducedMotion()
  return (
    <Card index={index}>
      <CardHeader title="강사 현황" description="이번 주 채점·피드백 처리율" />
      <ul className="grid grid-cols-4 gap-2">
        {teachers.slice(0, 4).map((t, i) => (
          <li key={t.id} className="flex min-w-0 flex-col items-center text-center">
            <div className="relative" style={{ width: RING, height: RING }}>
              <svg width={RING} height={RING} className="absolute inset-0 -rotate-90" aria-hidden>
                <circle cx={RING / 2} cy={RING / 2} r={R} fill="none" stroke={CHART.track} strokeWidth={STROKE} />
                <motion.circle
                  cx={RING / 2}
                  cy={RING / 2}
                  r={R}
                  fill="none"
                  stroke={CHART.brand}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  strokeDasharray={C}
                  initial={reduced ? false : { strokeDashoffset: C }}
                  animate={{ strokeDashoffset: C * (1 - t.processRate / 100) }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.25 + i * 0.05 }}
                />
              </svg>
              <Avatar name={t.name} size={40} colorClassName={`${AVATAR_COLORS[i % AVATAR_COLORS.length]} text-white`} className="absolute top-1.5 left-1.5" />
            </div>
            <p className="mt-2 w-full truncate text-xs font-bold text-ink">{t.name}</p>
            <p className="w-full truncate text-[10.5px] text-muted">{t.subject}</p>
            <p className="mt-1 text-sm font-extrabold tabular-nums text-ink">{t.processRate}%</p>
          </li>
        ))}
      </ul>
    </Card>
  )
}
