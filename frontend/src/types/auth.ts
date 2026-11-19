// API 타입은 백엔드 OpenAPI 명세에서 생성한 schema.d.ts 를 기준으로 한다 (npm run gen:api)
import type { components } from '@/api/schema'

/** 로그인한 사용자 (GET /api/auth/me 응답) */
export type Me = components['schemas']['MeResponse']

/** 역할 (DB enum user_role 과 같은 값) */
export type Role = Me['role']

export interface LoginRequest {
  loginId: string // 운영자: 아이디, 학생: 학생 코드(S-0001)
  password: string
}
