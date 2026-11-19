// 로그인 상태 (Zustand). 서버 데이터 캐시는 TanStack Query 가 맡고, 여기에는 "누가 로그인했는지"만 둔다.
import { create } from 'zustand'
import * as authApi from '@/api/auth'
import { setUnauthorizedHandler } from '@/api/client'
import type { LoginRequest, Me } from '@/types/auth'

type AuthStatus = 'unknown' | 'authenticated' | 'anonymous'

interface AuthState {
  status: AuthStatus // unknown: 앱 시작 직후 아직 확인 전
  user: Me | null
  /** 앱 시작 시 1회: 세션이 살아 있는지 확인 */
  bootstrap: () => Promise<void>
  login: (req: LoginRequest) => Promise<Me>
  logout: () => Promise<void>
  /** API 가 401 을 돌려주면(세션 만료) 호출 */
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'unknown',
  user: null,

  bootstrap: async () => {
    try {
      const user = await authApi.getMe()
      set(user ? { status: 'authenticated', user } : { status: 'anonymous', user: null })
    } catch {
      set({ status: 'anonymous', user: null })
    }
  },

  login: async (req) => {
    const user = await authApi.login(req)
    set({ status: 'authenticated', user })
    return user
  },

  logout: async () => {
    try {
      await authApi.logout()
    } finally {
      set({ status: 'anonymous', user: null })
    }
  },

  clear: () => set({ status: 'anonymous', user: null }),
}))

// 로그인 상태에서 API 가 401 을 돌려주면(세션 만료) 로그아웃 상태로 바꾼다 → 가드가 /login 으로 보낸다
setUnauthorizedHandler(() => {
  if (useAuthStore.getState().status === 'authenticated') useAuthStore.getState().clear()
})
