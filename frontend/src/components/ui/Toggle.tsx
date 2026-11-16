import { cn } from '@/lib/cn'

export interface ToggleOption<T extends string> {
  value: T
  label: string
}

interface ToggleProps<T extends string> {
  options: ToggleOption<T>[]
  value: T
  onChange: (value: T) => void
  /** navy: 선택 시 남색 pill / subtle: 회색 트랙 위 흰 pill */
  variant?: 'navy' | 'subtle'
  size?: 'sm' | 'xs'
  ariaLabel: string
  className?: string
}

export function Toggle<T extends string>({
  options,
  value,
  onChange,
  variant = 'navy',
  size = 'sm',
  ariaLabel,
  className,
}: ToggleProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('inline-flex items-center gap-0.5 rounded-full p-0.5', variant === 'subtle' ? 'bg-track' : 'bg-transparent', className)}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-full font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand',
              size === 'sm' ? 'h-7 px-3 text-xs' : 'h-6 px-2.5 text-[11px]',
              active
                ? variant === 'navy'
                  ? 'bg-navy text-white'
                  : 'bg-white text-ink shadow-sm'
                : 'text-muted hover:text-ink',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
