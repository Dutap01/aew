import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { cardEnter } from '@/lib/motion'
import { cn } from '@/lib/cn'

interface CardProps {
  children: ReactNode
  className?: string
  /** 진입 애니메이션 순번 (0.05s 간격 stagger) */
  index?: number
  /** hover 시 떠오르는 효과 */
  hoverLift?: boolean
}

export function Card({ children, className, index = 0, hoverLift = true }: CardProps) {
  const reduced = useReducedMotion()
  return (
    <motion.section
      variants={cardEnter}
      custom={index}
      initial={reduced ? false : 'hidden'}
      animate="show"
      whileHover={hoverLift && !reduced ? { y: -4 } : undefined}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className={cn(
        'rounded-card bg-white p-5 shadow-card transition-shadow duration-200',
        hoverLift && 'hover:shadow-card-hover',
        className,
      )}
    >
      {children}
    </motion.section>
  )
}

interface CardHeaderProps {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function CardHeader({ title, description, action, className }: CardHeaderProps) {
  return (
    <header className={cn('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-bold tracking-tight text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-[11.5px] text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}
