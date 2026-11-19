import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence, MotionConfig } from 'motion/react'
import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router'
import { Splash } from '@/components/layout/Splash'
import { router } from '@/router'
import { useAuthStore } from '@/stores/authStore'

const SPLASH_MS = 600

// 서버 데이터 캐시. 화면 간 이동 시 30초 동안은 다시 요청하지 않는다.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
})

export function App() {
  const authStatus = useAuthStore((s) => s.status)
  const bootstrap = useAuthStore((s) => s.bootstrap)
  const [minSplashDone, setMinSplashDone] = useState(false)

  useEffect(() => {
    bootstrap()
    const id = window.setTimeout(() => setMinSplashDone(true), SPLASH_MS)
    return () => window.clearTimeout(id)
  }, [bootstrap])

  // 스플래시: 최소 0.6초 + 로그인 상태 확인이 끝날 때까지
  const booting = !minSplashDone || authStatus === 'unknown'

  return (
    <QueryClientProvider client={queryClient}>
      {/* reducedMotion="user": OS 의 '동작 줄이기' 설정 시 motion 의 transform/layout 애니메이션을 끈다 */}
      <MotionConfig reducedMotion="user">
        <AnimatePresence>{booting && <Splash />}</AnimatePresence>
        {!booting && <RouterProvider router={router} />}
      </MotionConfig>
    </QueryClientProvider>
  )
}
