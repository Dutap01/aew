import { ArrowDownWideNarrow } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { cn } from '@/utils/cn'
import type { ClassRow } from '@/types/dashboard'

type SortKey = 'homeworkRate' | 'averageScore' | 'students'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'homeworkRate', label: '제출률순' },
  { key: 'averageScore', label: '평균점수순' },
  { key: 'students', label: '인원순' },
]

interface ClassTableProps {
  rows: ClassRow[]
  index?: number
}

export function ClassTable({ rows, index }: ClassTableProps) {
  const [sortIdx, setSortIdx] = useState(0)
  const sort = SORTS[sortIdx]
  const sorted = useMemo(() => [...rows].sort((a, b) => b[sort.key] - a[sort.key]), [rows, sort.key])

  return (
    <Card index={index}>
      <CardHeader
        title="반별 현황"
        description={`${rows.length}개 반 · 이번 주 기준`}
        action={
          <button
            type="button"
            onClick={() => setSortIdx((i) => (i + 1) % SORTS.length)}
            className="inline-flex h-7 items-center gap-1 rounded-full border border-line px-2.5 text-[11px] font-semibold text-ink transition-colors hover:bg-panel focus-visible:outline-2 focus-visible:outline-brand"
            aria-label={`정렬 기준 변경 (현재 ${sort.label})`}
          >
            <ArrowDownWideNarrow className="size-3.5" aria-hidden />
            {sort.label}
          </button>
        }
      />

      <div className="@container -mx-2 overflow-x-auto">
        <table className="w-full min-w-[300px] border-separate border-spacing-y-1 text-xs">
          <thead>
            <tr className="text-left text-[11px] text-muted">
              <th scope="col" className="px-2 pb-1 font-medium">반</th>
              <th scope="col" className="hidden px-2 pb-1 font-medium @sm:table-cell">담당 강사</th>
              <th scope="col" className="px-2 pb-1 text-right font-medium">인원</th>
              <th scope="col" className="px-2 pb-1 font-medium">숙제 제출률</th>
              <th scope="col" className="px-2 pb-1 text-right font-medium">평균</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => {
              const top = i === 0
              const cell = cn('px-2 py-2.5', top && 'bg-brand-50')
              return (
                <tr key={row.id} className="transition-colors hover:[&>td]:bg-panel">
                  <td className={cn(cell, 'rounded-l-xl font-bold text-ink')}>{row.name}</td>
                  <td className={cn(cell, 'hidden text-ink/80 @sm:table-cell')}>{row.teacher}</td>
                  <td className={cn(cell, 'text-right tabular-nums')}>{row.students}</td>
                  <td className={cell}>
                    <div className="flex items-center gap-2">
                      <ProgressBar
                        value={row.homeworkRate}
                        className="w-10 @sm:w-14"
                        trackClassName={top ? 'bg-white' : 'bg-track'}
                        barClassName={row.homeworkRate < 60 ? 'bg-wait' : 'bg-brand'}
                        label={`${row.name} 숙제 제출률`}
                      />
                      <span className="tabular-nums font-semibold">{row.homeworkRate}%</span>
                    </div>
                  </td>
                  <td className={cn(cell, 'rounded-r-xl text-right font-bold tabular-nums text-ink')}>{row.averageScore.toFixed(1)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
