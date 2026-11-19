import { ShieldAlert } from 'lucide-react'
import { Link } from 'react-router'
import { Card } from '@/components/ui/Card'

/** 로그인은 했지만 역할상 볼 수 없는 화면 */
export function ForbiddenView() {
  return (
    <Card hoverLift={false} className="flex min-h-80 flex-col items-center justify-center gap-3 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-alert/10 text-alert">
        <ShieldAlert className="size-6" aria-hidden />
      </span>
      <p className="text-sm font-bold text-ink">이 화면을 볼 권한이 없습니다</p>
      <p className="text-xs text-muted">필요하면 대표에게 권한을 요청하세요.</p>
      <Link to="/" className="text-xs font-semibold text-brand-700 hover:underline">
        첫 화면으로
      </Link>
    </Card>
  )
}
