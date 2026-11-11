// 역할 상수 및 권한 판별 유틸 (Vue 의존성 없음)
export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
})

export function hasAnyRole(userRoles = [], requiredRoles = []) {
  if (requiredRoles.length === 0) return true
  return requiredRoles.some((role) => userRoles.includes(role))
}
