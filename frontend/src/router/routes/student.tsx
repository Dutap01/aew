// 학생 화면 (/s/**). 학생 본인만.
import type { RouteObject } from 'react-router'
import { RequireStudent } from '@/router/guards'
import { PlaceholderView } from '@/views/base/PlaceholderView'

export const studentRoutes: RouteObject[] = [
  {
    path: 's',
    element: <RequireStudent />,
    children: [
      { path: 'timetable', element: <PlaceholderView title="내 시간표" plan="2주차" /> },
      { path: 'homework', element: <PlaceholderView title="내 숙제" plan="4주차" /> },
      { path: 'homework/:id', element: <PlaceholderView title="숙제 풀기" plan="4주차" /> },
      { path: 'messages', element: <PlaceholderView title="선생님께 질문" plan="4주차" /> },
      { path: 'messages/:threadId', element: <PlaceholderView title="선생님께 질문" plan="4주차" /> },
      { path: 'test/:attemptId', element: <PlaceholderView title="레벨테스트 응시" plan="2주차" /> },
    ],
  },
]
