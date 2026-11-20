// 라우트 가드. 화면 접근을 막는 것은 편의용이고, 실제 보호는 백엔드 API 에서 한다.
import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuthStore } from '@/stores/authStore'
import type { Role } from '@/types/auth'
import { hasRole, homePathOf } from '@/utils/role'
import { ForbiddenView } from '@/views/base/ForbiddenView'

/** 로그인 + (선택) 역할 검사. roles 를 생략하면 로그인만 확인 */
export function RequireAuth({ roles, children }: { roles?: readonly Role[]; children?: ReactNode }) {
  const status = useAuthStore((s) => s.status)
  const user = useAuthStore((s) => s.user)
  const location = useLocation()

  if (status === 'unknown') return null // App 이 스플래시를 띄우는 동안
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  if (roles && !hasRole(user.role, roles)) return <ForbiddenView />
  return children ?? <Outlet />
}

/** 학생 전용 (대표도 학생 화면은 볼 수 없다: 학생 본인 데이터 기준 화면이라서) */
/** 학생 화면. allowTestTaker: 레벨테스트 전용 계정도 들어올 수 있는 화면 (레벨테스트 응시만) */
export function RequireStudent({ allowTestTaker = false }: { allowTestTaker?: boolean }) {
  const user = useAuthStore((s) => s.user)
  if (user && user.role !== 'student' && !(allowTestTaker && user.role === 'test_taker')) return <ForbiddenView />
  return <RequireAuth />
}

/** 이미 로그인했으면 로그인 화면 대신 첫 화면으로 */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  return user ? <Navigate to={homePathOf(user.role)} replace /> : children
}
