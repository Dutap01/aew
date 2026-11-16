import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@assets': fileURLToPath(new URL('./assets', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/recharts|d3-|victory-vendor|@reduxjs|immer|reselect/.test(id)) return 'charts'
          if (/motion|framer/.test(id)) return 'motion'
          if (/react-router/.test(id)) return 'router'
          if (/[\\/]react(-dom)?[\\/]|scheduler/.test(id)) return 'react'
        },
      },
    },
  },
  server: {
    port: 5173,
    // 개발 시 /api 요청은 Spring(8080)으로 전달
    proxy: { '/api': 'http://localhost:8080' },
  },
})
