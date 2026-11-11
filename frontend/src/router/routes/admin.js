import { ROLES } from '@/utils/RoleUtils'

export default [
  {
    path: '/admin',
    meta: { requiresAuth: true, roles: [ROLES.ADMIN] },
    children: [
      {
        path: '',
        name: 'admin-dashboard',
        component: () => import('@/views/admin/AdminDashboardView.vue'),
      },
    ],
  },
]
