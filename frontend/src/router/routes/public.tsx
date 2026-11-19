// 로그인 없이 여는 화면: 메인, 강의 소개, 상담·레벨테스트 신청(모바일), 학부모 리포트 링크
import type { RouteObject } from 'react-router'
import type { PublicRouteHandle } from '@/components/layout/PublicLayout'
import { PlaceholderView } from '@/views/base/PlaceholderView'
import { ApplyView } from '@/views/public/ApplyView'
import { CurriculumLevelView, CurriculumView } from '@/views/public/CurriculumView'
import { LandingView } from '@/views/public/LandingView'

const wide: PublicRouteHandle = { wide: true }

/** 메인(/): 임시 터미널 화면이라 공개 레이아웃(헤더·하단) 없이 단독으로 */
export const landingRoute: RouteObject = { index: true, element: <LandingView /> }

export const publicRoutes: RouteObject[] = [
  { path: 'curriculum', element: <CurriculumView />, handle: wide },
  { path: 'curriculum/:slug', element: <CurriculumLevelView />, handle: wide },
  { path: 'apply/consult', element: <ApplyView key="consult" type="consult" /> },
  { path: 'apply/level-test', element: <ApplyView key="level_test" type="level_test" /> },
  { path: 'r/:token', element: <PlaceholderView title="학습 리포트" plan="5주차" bare /> },
]
