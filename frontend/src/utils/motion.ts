import type { Transition, Variants } from 'motion/react'

export const STAGGER_STEP = 0.05

export const easeOut: Transition['ease'] = [0.22, 1, 0.36, 1]

/** 카드 진입: 아래에서 위로 페이드인. custom 으로 순번(index)을 받아 0.05s 간격으로 지연 */
export const cardEnter: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: easeOut, delay: index * STAGGER_STEP },
  }),
}

/** 메인 패널 라우트 전환: 페이드 + 약한 블러 */
export const pageTransition: Variants = {
  initial: { opacity: 0, filter: 'blur(6px)' },
  animate: { opacity: 1, filter: 'blur(0px)', transition: { duration: 0.28, ease: easeOut } },
  exit: { opacity: 0, filter: 'blur(6px)', transition: { duration: 0.18, ease: 'easeIn' } },
}
