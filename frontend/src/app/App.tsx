import { AnimatePresence, MotionConfig } from 'motion/react'
import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router'
import { router } from './router'
import { Splash } from './Splash'

const SPLASH_MS = 600

export function App() {
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    const id = window.setTimeout(() => setBooting(false), SPLASH_MS)
    return () => window.clearTimeout(id)
  }, [])

  return (
    // reducedMotion="user": OS 의 '동작 줄이기' 설정 시 motion 의 transform/layout 애니메이션을 끈다
    <MotionConfig reducedMotion="user">
      <AnimatePresence>{booting && <Splash />}</AnimatePresence>
      {!booting && <RouterProvider router={router} />}
    </MotionConfig>
  )
}
