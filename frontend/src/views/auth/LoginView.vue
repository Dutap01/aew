<script setup>
import { useRoute, useRouter } from 'vue-router'
import BaseButton from '@/components/common/BaseButton.vue'
import { useAuthStore } from '@/stores/AuthStore'
import { ROLES } from '@/utils/RoleUtils'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// TODO: 백엔드 인증 API 연동 시 실제 로그인 폼으로 교체 (현재는 개발용 역할 선택)
function loginAs(name, roles) {
  authStore.login({ name, roles })
  router.push(route.query.redirect || '/')
}
</script>

<template>
  <main>
    <h1>로그인</h1>
    <p>개발용: 역할을 선택해 로그인합니다.</p>
    <BaseButton @click="loginAs('관리자', [ROLES.ADMIN])">관리자로 로그인</BaseButton>
    <BaseButton @click="loginAs('매니저', [ROLES.MANAGER])">매니저로 로그인</BaseButton>
  </main>
</template>
