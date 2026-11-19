// 메인 페이지 (/) — 임시. 터미널 느낌으로 버튼 3개만 둔다. 키보드 1·2·3 으로도 이동.
// LMS: 로그인 전이면 로그인 화면 → 로그인 후 역할별 첫 화면, 로그인 상태면 바로 내 화면
import { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuthStore } from '@/stores/authStore'
import { homePathOf } from '@/utils/role'

export function LandingView() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const lmsPath = user ? homePathOf(user.role) : '/login'
  const LINKS = useMemo(
    () => [
      { key: '1', to: '/apply/consult', label: '상담 신청' },
      { key: '2', to: '/apply/level-test', label: '레벨테스트 신청' },
      { key: '3', to: lmsPath, label: 'LMS' },
    ],
    [lmsPath],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const link = LINKS.find((l) => l.key === e.key)
      if (link && !e.ctrlKey && !e.metaKey && !e.altKey) navigate(link.to)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate, LINKS])

  return (
    <main className="flex min-h-dvh items-center justify-center bg-black p-4 font-mono text-[#33ff66]">
      <div className="w-full max-w-md">
        <p className="text-sm text-[#33ff66]/60">$ ./lms --menu</p>
        <p className="mt-1 mb-6 text-sm">select an option:</p>
        <nav aria-label="메뉴" className="space-y-2">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="block border border-[#33ff66]/50 px-4 py-3 text-base hover:bg-[#33ff66] hover:text-black focus-visible:bg-[#33ff66] focus-visible:text-black focus-visible:outline-none"
            >
              [{l.key}] {l.label}
            </Link>
          ))}
        </nav>
        <p className="mt-6 text-sm">
          &gt; <span className="inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-[#33ff66] motion-reduce:animate-none" aria-hidden />
        </p>
      </div>
    </main>
  )
}
