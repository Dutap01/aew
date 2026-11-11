import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@assets': fileURLToPath(new URL('./assets', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // 개발 시 /api 요청은 Spring(8080)으로 전달
    proxy: { '/api': 'http://localhost:8080' },
  },
})
