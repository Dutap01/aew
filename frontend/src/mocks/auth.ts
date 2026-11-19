// 백엔드 로그인 API 가 생기기 전까지 쓰는 테스트 계정 (비밀번호는 모두 1234)
import type { Me } from '@/types/auth'

export const MOCK_PASSWORD = '1234'

export const mockUsers: Me[] = [
  { id: 'u-owner', loginId: 'owner', name: '정하늘', role: 'owner' },
  { id: 'u-counselor', loginId: 'counselor', name: '김상담', role: 'counselor' },
  { id: 'u-teacher', loginId: 'teacher', name: '이강사', role: 'teacher' },
  { id: 'u-student', loginId: 'S-0001', name: '박학생', role: 'student' },
]
