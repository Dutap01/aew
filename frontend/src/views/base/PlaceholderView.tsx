import { Construction } from 'lucide-react'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'

interface PlaceholderViewProps {
  title: string
  /** 구현 예정 시점 (docs/v1-plan.md 일정) */
  plan?: string
  /** 로그인 전 화면(PublicLayout)에서는 상단바 없이 제목만 */
  bare?: boolean
}

export function PlaceholderView({ title, plan, bare }: PlaceholderViewProps) {
  return (
    <>
      {bare ? <h1 className="mb-5 text-2xl font-extrabold tracking-tight text-ink">{title}</h1> : <Topbar title={title} />}
      <Card hoverLift={false} className="flex min-h-80 flex-col items-center justify-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <Construction className="size-6" aria-hidden />
        </span>
        <p className="text-sm font-bold text-ink">{title} 화면은 준비 중입니다</p>
        {plan && <p className="text-xs text-muted">구현 예정: {plan}</p>}
      </Card>
    </>
  )
}
