import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useLocation, useOutlet } from 'react-router'
import { getShellSummary } from '@/api/dashboard'
import { pageTransition } from '@/lib/motion'
import type { ShellSummary } from '@/types/dashboard'
import { Sidebar } from './Sidebar'

const COLLAPSE_QUERY = '(max-width: 1023px)'

export function AppShell() {
  const location = useLocation()
  const outlet = useOutlet()
  const reduced = useReducedMotion()
  const [summary, setSummary] = useState<ShellSummary | null>(null)
  const [collapsed, setCollapsed] = useState(() => window.matchMedia(COLLAPSE_QUERY).matches)

  useEffect(() => {
    let alive = true
    getShellSummary().then((s) => alive && setSummary(s))
    return () => {
      alive = false
    }
  }, [])

  // 1024px 미만으로 줄어들면 자동으로 접고, 넓어지면 다시 편다
  useEffect(() => {
    const mql = window.matchMedia(COLLAPSE_QUERY)
    const onChange = (e: MediaQueryListEvent) => setCollapsed(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return (
    <div className="app-frame flex min-h-dvh">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} summary={summary} />

      <div className="min-w-0 flex-1 py-3 pr-3 md:py-4 md:pr-4">
        <main className="relative min-h-[calc(100dvh-1.5rem)] overflow-hidden rounded-panel bg-panel md:min-h-[calc(100dvh-2rem)]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              variants={reduced ? undefined : pageTransition}
              initial="initial"
              animate="animate"
              exit="exit"
              className="px-5 py-6 md:px-7 md:py-7"
            >
              {outlet}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
