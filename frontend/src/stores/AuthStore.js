import { defineStore } from 'pinia'
import { hasAnyRole } from '@/utils/RoleUtils'

// TODO: 백엔드 인증(API) 연동 전까지는 메모리에만 로그인 상태를 보관
export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null, // { name, roles: [] }
  }),
  getters: {
    isLoggedIn: (state) => state.user !== null,
    roles: (state) => state.user?.roles ?? [],
  },
  actions: {
    login(user) {
      this.user = user
    },
    logout() {
      this.user = null
    },
    hasRole(requiredRoles) {
      return hasAnyRole(this.roles, requiredRoles)
    },
  },
})
