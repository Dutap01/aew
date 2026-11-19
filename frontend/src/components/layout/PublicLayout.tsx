import { Outlet } from 'react-router'

/** 로그인 없이 여는 화면(신청서, 리포트 링크)용. 모바일 우선 한 단 레이아웃 */
export function PublicLayout() {
  return (
    <div className="min-h-dvh bg-panel">
      <header className="bg-brand-900 px-5 py-4 text-white">
        <p className="mx-auto max-w-xl text-sm font-extrabold tracking-tight">LMS</p>
      </header>
      <main className="mx-auto max-w-xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
