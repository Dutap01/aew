import { motion } from 'motion/react'

/** 첫 로딩 스플래시 (어두운 초록 + 회전 스피너) */
export function Splash() {
  return (
    <motion.div
      key="splash"
      role="status"
      aria-label="로딩 중"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-brand-900"
    >
      <span className="size-11 animate-spin rounded-full border-[3px] border-white/20 border-t-white motion-reduce:animate-none" />
      <span className="text-xs font-semibold tracking-[0.2em] text-white/70">LMS ADMIN</span>
    </motion.div>
  )
}
