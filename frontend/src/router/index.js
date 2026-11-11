import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/AuthStore'
import { setupGuards } from './guards'
import baseRoutes from './routes/base'
import authRoutes from './routes/auth'
import adminRoutes from './routes/admin'
import managerRoutes from './routes/manager'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    ...baseRoutes,
    ...authRoutes,
    ...adminRoutes,
    ...managerRoutes,
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/base/NotFoundView.vue'),
    },
  ],
})

setupGuards(router, () => useAuthStore())

export default router
