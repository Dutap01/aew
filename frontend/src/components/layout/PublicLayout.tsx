import { LogIn, LayoutDashboard } from 'lucide-react'
import { Link, Outlet, useMatches } from 'react-router'
import { ACADEMY } from '@/config/academy'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/utils/cn'
import { homePathOf } from '@/utils/role'

/** 라우트 handle 로 본문 폭을 고른다: wide(메인·강의 소개) / 기본(신청서, 휴대폰 폭) */
export interface PublicRouteHandle {
  wide?: boolean
}

/** 로그인 없이 여는 화면(메인, 강의 소개, 신청서, 리포트 링크) */
export function PublicLayout() {
  const user = useAuthStore((s) => s.user)
  const matches = useMatches()
  const wide = matches.some((m) => (m.handle as PublicRouteHandle | undefined)?.wide)

  return (
    <div className="flex min-h-dvh flex-col bg-panel">
      <header className="bg-brand-900 text-white">
        <div className={cn('mx-auto flex h-14 items-center justify-between gap-3 px-4', wide ? 'max-w-5xl' : 'max-w-xl')}>
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-brand-800">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden>
                <path d="M4 18 L9 6 L14 18 M6 13 H12 M15 6 V18 H20" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="truncate text-sm font-extrabold tracking-tight">{ACADEMY.name}</span>
          </Link>
          {user ? (
            <Link to={homePathOf(user.role)}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 text-xs font-semibold hover:bg-white/25">
              <LayoutDashboard className="size-3.5" aria-hidden /> 내 화면으로
            </Link>
          ) : (
            <Link to="/login"
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 text-xs font-semibold hover:bg-white/25">
              <LogIn className="size-3.5" aria-hidden /> 로그인
            </Link>
          )}
        </div>
      </header>

      <main className={cn('mx-auto w-full flex-1 px-4 py-6', wide ? 'max-w-5xl md:py-10' : 'max-w-xl')}>
        <Outlet />
      </main>

      <footer className="border-t border-line bg-white">
        <div className={cn('mx-auto px-4 py-5 text-xs leading-relaxed text-muted', wide ? 'max-w-5xl' : 'max-w-xl')}>
          <p className="font-semibold text-ink">{ACADEMY.name}</p>
          <p>{ACADEMY.address}</p>
          <p>
            문의 <a href={`tel:${ACADEMY.phone}`} className="font-semibold text-brand-700">{ACADEMY.phone}</a> · {ACADEMY.hours}
          </p>
        </div>
      </footer>
    </div>
  )
}
