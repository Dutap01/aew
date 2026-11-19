import { createBrowserRouter } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { LoginView } from '@/views/auth/LoginView'
import { NotFoundView } from '@/views/base/NotFoundView'
import { RedirectIfAuthenticated, RequireAuth } from './guards'
import { adminRoutes } from './routes/admin'
import { landingRoute, publicRoutes } from './routes/public'
import { studentRoutes } from './routes/student'
import { teacherRoutes } from './routes/teacher'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <RedirectIfAuthenticated>
        <LoginView />
      </RedirectIfAuthenticated>
    ),
  },
  // 메인(/): 로그인 없이, 레이아웃 없이
  landingRoute,
  // 강의 소개·신청서: 로그인 없이
  { element: <PublicLayout />, children: publicRoutes },
  {
    // 로그인 후 화면: 사이드바 프레임 안에서 역할별 라우트
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          ...adminRoutes,
          ...teacherRoutes,
          ...studentRoutes,
          { path: '*', element: <NotFoundView /> },
        ],
      },
    ],
  },
])
