import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/cn'

interface ProgressBarProps {
  value: number // 0~100
  className?: string
  barClassName?: string
  trackClassName?: string
  label?: string
}

export function ProgressBar({ value, className, barClassName = 'bg-brand', trackClassName = 'bg-track', label }: ProgressBarProps) {
  const reduced = useReducedMotion()
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={label}
      className={cn('h-1.5 w-full overflow-hidden rounded-full', trackClassName, className)}
    >
      <motion.div
        className={cn('h-full rounded-full', barClassName)}
        initial={reduced ? false : { width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      />
    </div>
  )
}
