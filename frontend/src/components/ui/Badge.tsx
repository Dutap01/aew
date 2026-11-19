import { cn } from '@/utils/cn'

/** 빨간 숫자 배지 */
export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null
  return (
    <span
      aria-label={`${count}건`}
      className={cn(
        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-alert px-1.5 text-[10px] font-bold tabular-nums leading-none text-white',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

/** NEW 같은 텍스트 태그 */
export function TagBadge({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-[18px] items-center rounded-full bg-white/90 px-1.5 text-[9.5px] font-extrabold tracking-wide text-brand-800',
        className,
      )}
    >
      {label}
    </span>
  )
}
