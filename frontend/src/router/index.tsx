import { createBrowserRouter } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { LoginView } from '@/views/auth/LoginView'
import { NotFoundView } from '@/views/base/NotFoundView'
import { HomeRedirect, RedirectIfAuthenticated, RequireAuth } from './guards'
import { adminRoutes } from './routes/admin'
import { publicRoutes } from './routes/public'
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
  { element: <PublicLayout />, children: publicRoutes },
  {
    // 로그인 후 화면: 사이드바 프레임 안에서 역할별 라우트
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <HomeRedirect /> },
          ...adminRoutes,
          ...teacherRoutes,
          ...studentRoutes,
          { path: '*', element: <NotFoundView /> },
        ],
      },
    ],
  },
])
