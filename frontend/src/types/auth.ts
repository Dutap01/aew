/** 역할 (DB enum user_role 과 같은 값) */
export type Role = 'owner' | 'counselor' | 'teacher' | 'student'

/** 로그인한 사용자 (GET /api/auth/me 응답) */
export interface Me {
  id: string
  loginId: string // 운영자: 아이디, 학생: 학생 코드(S-0001)
  name: string
  role: Role
}

export interface LoginRequest {
  loginId: string
  password: string
}
