// 강사 화면 (/t/**). 대표도 접근 가능.
import type { RouteObject } from 'react-router'
import { RequireAuth } from '@/router/guards'
import { PlaceholderView } from '@/views/base/PlaceholderView'

export const teacherRoutes: RouteObject[] = [
  {
    path: 't',
    element: <RequireAuth roles={['teacher']} />,
    children: [
      { path: 'dashboard', element: <PlaceholderView title="강사 대시보드" plan="5주차" /> },
      { path: 'timetable', element: <PlaceholderView title="내 시간표" plan="2주차" /> },
      { path: 'attendance', element: <PlaceholderView title="출석부" plan="4주차" /> },
      { path: 'attendance/:classId', element: <PlaceholderView title="출석부" plan="4주차" /> },
      { path: 'homework', element: <PlaceholderView title="보충 숙제" plan="4주차" /> },
      { path: 'homework/:setId', element: <PlaceholderView title="숙제 제출 현황" plan="4주차" /> },
      { path: 'feedback', element: <PlaceholderView title="오답 피드백 검수" plan="4주차" /> },
      // 학생 질문 (실시간 1:1 메시지). 대표는 전체 대화 조회만
      { path: 'messages', element: <PlaceholderView title="학생 질문" plan="4주차" /> },
      { path: 'messages/:threadId', element: <PlaceholderView title="학생 질문" plan="4주차" /> },
    ],
  },
]
