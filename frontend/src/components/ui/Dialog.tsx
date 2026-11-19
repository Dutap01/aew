import { X } from 'lucide-react'
import { type ReactNode, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/utils/cn'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  /** 아래 버튼 영역 */
  footer?: ReactNode
  className?: string
}

/** 모달 창. Esc·바깥 클릭으로 닫히고, 열리면 첫 입력칸에 포커스, 닫히면 원래 위치로 포커스를 돌려준다 */
export function Dialog({ open, onClose, title, children, footer, className }: DialogProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    const first = panelRef.current?.querySelector<HTMLElement>('input, select, textarea, button:not([data-dialog-close])')
    first?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previous?.focus()
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId}
        className={cn('flex max-h-[92dvh] w-full flex-col rounded-t-panel bg-white shadow-card-hover sm:max-w-md sm:rounded-panel', className)}>
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 id={titleId} className="min-w-0 truncate text-base font-extrabold text-ink">{title}</h2>
          <button type="button" data-dialog-close onClick={onClose} aria-label="닫기"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-track hover:text-ink">
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
