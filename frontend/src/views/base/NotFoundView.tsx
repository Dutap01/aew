import { SearchX } from 'lucide-react'
import { Link } from 'react-router'
import { Card } from '@/components/ui/Card'

export function NotFoundView() {
  return (
    <Card hoverLift={false} className="flex min-h-80 flex-col items-center justify-center gap-3 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-track text-muted">
        <SearchX className="size-6" aria-hidden />
      </span>
      <p className="text-sm font-bold text-ink">페이지를 찾을 수 없습니다</p>
      <Link to="/" className="text-xs font-semibold text-brand-700 hover:underline">
        첫 화면으로
      </Link>
    </Card>
  )
}
