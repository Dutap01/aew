// 로그인 API (Spring Security 세션 로그인)
import type { LoginRequest, Me } from '@/types/auth'
import { api, ApiError } from './client'

/** 로그인 안 되어 있으면 null. 첫 요청이라 CSRF 쿠키(XSRF-TOKEN)도 이때 받는다 */
export async function getMe(): Promise<Me | null> {
  try {
    return await api.get<Me>('/auth/me', { skipUnauthorizedHandler: true })
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null
    throw e
  }
}

/** 실패하면 ApiError(401, body.message) */
export function login(req: LoginRequest): Promise<Me> {
  return api.postForm<Me>('/auth/login', { loginId: req.loginId, password: req.password }, { skipUnauthorizedHandler: true })
}

export function logout(): Promise<void> {
  return api.post<void>('/auth/logout', undefined, { skipUnauthorizedHandler: true })
}
