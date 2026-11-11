import { ROLES } from '@/utils/RoleUtils'

export default [
  {
    path: '/manager',
    meta: { requiresAuth: true, roles: [ROLES.MANAGER] },
    children: [
      {
        path: '',
        name: 'manager-dashboard',
        component: () => import('@/views/manager/ManagerDashboardView.vue'),
      },
    ],
  },
]
