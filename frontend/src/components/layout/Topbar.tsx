import { Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatToday } from '@/lib/format'

interface TopbarProps {
  title: string
  subtitle?: ReactNode
}

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">{title}</h1>
        <p className="mt-1 text-xs text-muted tabular-nums">{subtitle ?? formatToday()}</p>
      </div>
      <label className="relative block w-full md:w-72">
        <span className="sr-only">검색</span>
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          type="search"
          placeholder="학생, 반, 상담 검색"
          className="h-10 w-full rounded-full border border-line bg-white pr-12 pl-10 text-sm text-ink shadow-card outline-none placeholder:text-muted/80 focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded-md border border-line bg-panel px-1.5 py-0.5 text-[10px] font-semibold text-muted">
          ⌘K
        </kbd>
      </label>
    </header>
  )
}
