// 역할 관련 유틸. 화면에서 메뉴를 숨기는 것은 편의용이고, 실제 접근 제어는 항상 백엔드 API 에서 한다.
import type { Role } from '@/types/auth'

export const ROLE_LABEL: Record<Role, string> = {
  owner: '대표',
  counselor: '상담실장',
  teacher: '강사',
  student: '학생',
}

/** 대표(owner)는 모든 화면에 접근할 수 있다 */
export function hasRole(role: Role | undefined, allowed: readonly Role[]): boolean {
  if (!role) return false
  return role === 'owner' || allowed.includes(role)
}

/** 로그인 직후 / 루트(/) 접속 시 이동할 첫 화면 */
export function homePathOf(role: Role): string {
  switch (role) {
    case 'owner':
    case 'counselor':
      return '/admin'
    case 'teacher':
      return '/t/dashboard'
    case 'student':
      return '/s/homework'
  }
}
