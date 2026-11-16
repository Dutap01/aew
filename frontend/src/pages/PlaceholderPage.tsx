import { Construction } from 'lucide-react'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <>
      <Topbar title={title} />
      <Card hoverLift={false} className="flex min-h-80 flex-col items-center justify-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <Construction className="size-6" aria-hidden />
        </span>
        <p className="text-sm font-bold text-ink">{title} 화면은 준비 중입니다</p>
        <p className="text-xs text-muted">대시보드 이외의 메뉴는 다음 단계에서 구현됩니다.</p>
      </Card>
    </>
  )
}
