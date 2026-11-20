// 학생 화면 (/s/**). 학생 본인만. 레벨테스트(/s/test)는 레벨테스트 전용 계정도.
import type { RouteObject } from 'react-router'
import { RequireStudent } from '@/router/guards'
import { PlaceholderView } from '@/views/base/PlaceholderView'
import { StudentTimetableView } from '@/views/student/MyTimetableView'
import { TakeTestView } from '@/views/student/TakeTestView'
import { StudentTestsView } from '@/views/student/TestsView'

export const studentRoutes: RouteObject[] = [
  {
    // 레벨테스트: 목록(학생 첫 화면) / 응시
    path: 's/test',
    element: <RequireStudent allowTestTaker />,
    children: [
      { index: true, element: <StudentTestsView /> },
      { path: ':attemptId', element: <TakeTestView /> },
    ],
  },
  {
    path: 's',
    element: <RequireStudent />,
    children: [
      { path: 'timetable', element: <StudentTimetableView /> },
      { path: 'homework', element: <PlaceholderView title="내 숙제" plan="4주차" /> },
      { path: 'homework/:id', element: <PlaceholderView title="숙제 풀기" plan="4주차" /> },
      { path: 'messages', element: <PlaceholderView title="선생님께 질문" plan="4주차" /> },
      { path: 'messages/:threadId', element: <PlaceholderView title="선생님께 질문" plan="4주차" /> },
    ],
  },
]
