// 로그인 API.
// 지금은 mocks/auth.ts 계정으로 흉내 내고, 새로고침해도 유지되도록 sessionStorage 에 둔다.
// 백엔드(세션 로그인)가 준비되면 각 함수 본문을 주석의 api 호출로 바꾼다.
import { MOCK_PASSWORD, mockUsers } from '@/mocks/auth'
import type { LoginRequest, Me } from '@/types/auth'
import { ApiError } from './client'
// import { api } from './client'

const MOCK_KEY = 'aew.mock.me'
const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms))

/** 로그인 안 되어 있으면 null */
export async function getMe(): Promise<Me | null> {
  // try { return await api.get<Me>('/auth/me') } catch (e) { if (e instanceof ApiError && e.status === 401) return null; throw e }
  await delay()
  const raw = sessionStorage.getItem(MOCK_KEY)
  return raw ? (JSON.parse(raw) as Me) : null
}

/** 실패하면 ApiError(401) */
export async function login(req: LoginRequest): Promise<Me> {
  // return api.post<Me>('/auth/login', req)
  await delay(300)
  const user = mockUsers.find((u) => u.loginId.toLowerCase() === req.loginId.trim().toLowerCase())
  if (!user || req.password !== MOCK_PASSWORD) {
    throw new ApiError(401, '아이디 또는 비밀번호가 올바르지 않습니다.', null)
  }
  sessionStorage.setItem(MOCK_KEY, JSON.stringify(user))
  return user
}

export async function logout(): Promise<void> {
  // await api.post<void>('/auth/logout')
  await delay()
  sessionStorage.removeItem(MOCK_KEY)
}
