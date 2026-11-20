// 폼 입력칸 공용: 라벨 + 입력 + 칸별 오류 (400 응답의 fieldErrors)
import type { ReactNode } from 'react'

export const INPUT_CLASS =
  'h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/20 aria-[invalid=true]:border-alert'

export const TEXTAREA_CLASS =
  'w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/20'

export function Field({ label, htmlFor, error, hint, children }: {
  label: string
  htmlFor?: string
  error?: string
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-ink">{label}</label>
      {children}
      {error ? <p className="mt-1 text-[11px] text-alert">{error}</p> : hint ? <p className="mt-1 text-[11px] text-muted">{hint}</p> : null}
    </div>
  )
}
