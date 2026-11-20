// 로그인 API (Spring Security 세션 로그인)
import type { LoginRequest, Me } from '@/types/auth'
import { api, ApiError } from './client'

/**
 * 로그인 안 되어 있으면 user 가 null. 첫 요청이라 CSRF 쿠키(XSRF-TOKEN)도 이때 받는다.
 * notice: 세션이 서버에서 끊긴 이유 (예: 레벨테스트 계정 사용 시간 끝남). 그냥 로그인 전이면 null
 */
export async function getMe(): Promise<{ user: Me | null; notice: string | null }> {
  try {
    return { user: await api.get<Me>('/auth/me', { skipUnauthorizedHandler: true }), notice: null }
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      const body = e.body as { message?: unknown } | null
      return { user: null, notice: body && typeof body.message === 'string' ? body.message : null }
    }
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
