<script setup>
import { onMounted, ref } from 'vue'
import BaseButton from '@/components/common/BaseButton.vue'
import { useLogStore } from '@/stores/LogStore'
import { useAuthStore } from '@/stores/AuthStore'
import { getHealth } from '@/api/health'

const logStore = useLogStore()
const authStore = useAuthStore()
const serverStatus = ref('확인 중...')

onMounted(async () => {
  try {
    const { status } = await getHealth()
    serverStatus.value = status
  } catch (e) {
    serverStatus.value = `연결 실패 (${e.status})`
    logStore.addLog(e.message)
  }
})
</script>

<template>
  <main>
    <h1>Home</h1>
    <p>서버 상태: <strong>{{ serverStatus }}</strong></p>

    <nav>
      <RouterLink to="/admin">관리자</RouterLink> |
      <RouterLink to="/manager">매니저</RouterLink> |
      <RouterLink v-if="!authStore.isLoggedIn" to="/login">로그인</RouterLink>
      <a v-else href="#" @click.prevent="authStore.logout()">로그아웃 ({{ authStore.user.name }})</a>
    </nav>

    <BaseButton @click="logStore.addLog('button clicked')">클릭</BaseButton>
    <ul>
      <li v-for="(log, i) in logStore.logs" :key="i">{{ log }}</li>
    </ul>
  </main>
</template>
