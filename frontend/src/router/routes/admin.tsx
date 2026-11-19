// 대표·상담실장 화면 (/admin/**). 백엔드 /api/admin/** 와 같은 역할 구분.
import type { RouteObject } from 'react-router'
import { RequireAuth } from '@/router/guards'
import { DashboardView } from '@/views/admin/DashboardView'
import { PlaceholderView } from '@/views/base/PlaceholderView'

export const adminRoutes: RouteObject[] = [
  {
    path: 'admin',
    element: <RequireAuth roles={['owner', 'counselor']} />,
    children: [
      { index: true, element: <DashboardView /> },
      { path: 'inquiries', element: <PlaceholderView title="상담·테스트 접수" plan="2주차" /> },
      { path: 'inquiries/:id', element: <PlaceholderView title="접수 상세" plan="2주차" /> },
      // 상담·레벨테스트 일정 달력 (월간·주간)
      { path: 'consult-calendar', element: <PlaceholderView title="상담 달력" plan="2주차" /> },
      // 학생·강사 검색 → 개인 주간 시간표 (?student=ID / ?teacher=ID)
      { path: 'timetables', element: <PlaceholderView title="시간표 조회" plan="2주차" /> },
      { path: 'students', element: <PlaceholderView title="학생" plan="2주차" /> },
      { path: 'students/:id', element: <PlaceholderView title="학생 타임라인" plan="2주차" /> },
      { path: 'level-tests', element: <PlaceholderView title="레벨테스트 결과" plan="2주차" /> },
      { path: 'diagnoses/:id', element: <PlaceholderView title="진단서" plan="3주차" /> },
      { path: 'reports', element: <PlaceholderView title="리포트 승인" plan="5주차" /> },
      { path: 'reports/:id', element: <PlaceholderView title="리포트 상세" plan="5주차" /> },
      { path: 'report-schedules', element: <PlaceholderView title="리포트 일정" plan="5주차" /> },
      { path: 'notifications', element: <PlaceholderView title="발송 이력" plan="5주차" /> },
      // 대표 전용
      {
        element: <RequireAuth roles={['owner']} />,
        children: [
          { path: 'placement', element: <PlaceholderView title="반 배정" plan="3주차" /> },
          { path: 'classes', element: <PlaceholderView title="반 구성" plan="2주차" /> },
          { path: 'ai-jobs', element: <PlaceholderView title="AI 처리 이력" plan="3주차" /> },
          { path: 'settings/users', element: <PlaceholderView title="계정·권한" plan="1주차 (백엔드 로그인 후)" /> },
          { path: 'settings/rules', element: <PlaceholderView title="룰·프롬프트" plan="P1" /> },
        ],
      },
    ],
  },
]
