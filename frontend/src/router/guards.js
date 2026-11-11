// 라우트 가드 (Vue/Pinia 를 직접 import 하지 않아 단독 테스트 가능)

/**
 * 이동 가능 여부 판단
 * @param to     이동할 라우트 (matched 배열 포함)
 * @param auth   { isLoggedIn: boolean, hasRole: (roles) => boolean }
 * @returns true 이면 통과, 아니면 리다이렉트할 위치
 */
export function checkAccess(to, auth) {
  const requiresAuth = to.matched.some((r) => r.meta?.requiresAuth)
  const roles = to.matched.flatMap((r) => r.meta?.roles ?? [])
  const guestOnly = to.matched.some((r) => r.meta?.guestOnly)

  if (requiresAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (roles.length > 0 && !auth.hasRole(roles)) {
    return { name: 'home' }
  }
  if (guestOnly && auth.isLoggedIn) {
    return { name: 'home' }
  }
  return true
}

export function setupGuards(router, getAuth) {
  router.beforeEach((to) => checkAccess(to, getAuth()))
}
