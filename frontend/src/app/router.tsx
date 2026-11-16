import { createBrowserRouter } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/pages/DashboardPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { ALL_NAV_ITEMS, NOTIFICATIONS_PATH } from './navigation'

const placeholderRoutes = ALL_NAV_ITEMS.filter((item) => item.path !== '/').map((item) => ({
  path: item.path.slice(1),
  element: <PlaceholderPage title={item.label} />,
}))

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      ...placeholderRoutes,
      { path: NOTIFICATIONS_PATH.slice(1), element: <PlaceholderPage title="알림" /> },
      { path: '*', element: <PlaceholderPage title="페이지를 찾을 수 없음" /> },
    ],
  },
])
