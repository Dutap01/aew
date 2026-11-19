// 로그인 없이 여는 화면: 상담·레벨테스트 신청(모바일), 커리큘럼 안내, 학부모 리포트 링크
import type { RouteObject } from 'react-router'
import { PlaceholderView } from '@/views/base/PlaceholderView'

export const publicRoutes: RouteObject[] = [
  { path: 'apply/consult', element: <PlaceholderView title="상담 신청" plan="2주차" bare /> },
  { path: 'apply/level-test', element: <PlaceholderView title="레벨테스트 신청" plan="2주차" bare /> },
  { path: 'curriculum/:slug', element: <PlaceholderView title="커리큘럼 안내" plan="P1" bare /> },
  { path: 'r/:token', element: <PlaceholderView title="학습 리포트" plan="5주차" bare /> },
]
