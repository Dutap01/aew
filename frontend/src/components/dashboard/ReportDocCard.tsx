import { ArrowUpRight, FileText } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Link } from 'react-router'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StatusPill } from '@/components/ui/StatusPill'
import { cardEnter } from '@/utils/motion'
import { cn } from '@/utils/cn'
import type { DiagnosisReport, ReportStatus } from '@/types/dashboard'

const BAR_COLOR: Record<ReportStatus, string> = {
  pending: 'bg-wait',
  reviewing: 'bg-brand',
  done: 'bg-navy',
}

interface ReportDocCardProps {
  report: DiagnosisReport
  index?: number
  /** 살짝 기울여 겹쳐 떠 있는 느낌을 준다 */
  tilted?: boolean
  className?: string
}

/** 폴더 탭 모양 진단서 카드 */
export function ReportDocCard({ report, index = 0, tilted, className }: ReportDocCardProps) {
  const reduced = useReducedMotion()
  const pct = (report.completedItems / report.totalItems) * 100

  return (
    <div className={cn(tilted && 'rotate-[3.5deg]', className)}>
      <motion.article
        variants={cardEnter}
        custom={index}
        initial={reduced ? false : 'hidden'}
        animate="show"
        whileHover={reduced ? undefined : { y: -4 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="group relative pt-3 drop-shadow-[0_1px_2px_rgb(20_40_20/0.08)] transition-[filter] duration-200 hover:drop-shadow-[0_8px_14px_rgb(20_40_20/0.12)]"
      >
        {/* 폴더 탭 */}
        <div className="absolute top-0 left-0 flex h-4 w-[72px] items-center gap-1 rounded-t-[10px] bg-white pl-2.5 [clip-path:polygon(0_0,82%_0,100%_100%,0_100%)]">
          <span className={cn('size-1.5 rounded-full', BAR_COLOR[report.status])} aria-hidden />
          <span className="text-[9px] font-bold tracking-wide text-muted">DIAG</span>
        </div>

        <div className="rounded-2xl rounded-tl-none bg-white p-4">
          <div className="flex items-start justify-between gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <FileText className="size-4" aria-hidden />
            </span>
            <StatusPill status={report.status} />
          </div>
          <p className="mt-3 truncate text-[15px] font-bold text-ink">{report.studentName}</p>
          <p className="truncate text-[11.5px] text-muted">
            {report.school} · {report.grade}
          </p>
          <ProgressBar value={pct} className="mt-3" barClassName={BAR_COLOR[report.status]} label={`${report.studentName} 진단서 진행률`} />
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted tabular-nums">
            <span>
              <b className="font-bold text-ink">{report.completedItems}</b>/{report.totalItems} 항목
            </span>
            <span>{report.updatedAt.slice(5).replace('-', '.')}</span>
          </div>
        </div>
      </motion.article>
    </div>
  )
}

interface RecentReportsProps {
  reports: DiagnosisReport[]
  index?: number
}

/** 최근 진단서 2장 — 두 번째 카드는 기울여 첫 카드 위에 겹친다 */
export function RecentReports({ reports, index = 0 }: RecentReportsProps) {
  const visible = reports.slice(0, 2)
  return (
    <section aria-labelledby="recent-reports-title">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 id="recent-reports-title" className="text-sm font-bold text-ink">
          최근 진단서
        </h2>
        <Link to="/diagnoses" className="inline-flex items-center gap-0.5 text-[11.5px] font-semibold text-muted hover:text-brand-700">
          전체 {reports.length}건 <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      <div className="grid grid-cols-2 pr-2">
        {visible.map((r, i) => (
          <ReportDocCard
            key={r.id}
            report={r}
            index={index + i}
            tilted={i === 1}
            className={i === 1 ? 'relative z-10 -ml-3 mt-2' : 'relative z-0'}
          />
        ))}
      </div>
    </section>
  )
}
