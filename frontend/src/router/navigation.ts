// 사이드바 메뉴 정의. roles 에 해당하는 사용자에게만 보인다 (대표는 전부 보임).
// 경로·화면 목록은 docs/v1-plan.md "화면 목록" 기준.
import {
  Bot,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  Headset,
  LayoutDashboard,
  type LucideIcon,
  MessageCircleQuestion,
  MessageSquareText,
  NotebookPen,
  Send,
  SendHorizontal,
  SlidersHorizontal,
  UserCog,
  Users,
  Waypoints,
} from 'lucide-react'
import type { Role } from '@/types/auth'
import { hasRole } from '@/utils/role'

export interface NavItem {
  key: string
  label: string
  path: string
  icon: LucideIcon
  roles: readonly Role[]
  /** true: roles 에 적힌 역할에게만 보임 (대표에게 자동으로 보이지 않음. 본인 기준 화면) */
  exact?: boolean
  /** ShellSummary.badges 에서 숫자를 가져올 key */
  badgeKey?: string
  tag?: string
}

export interface NavSection {
  title: string
  items: NavItem[]
}

const ADMIN: readonly Role[] = ['owner', 'counselor']
const OWNER: readonly Role[] = ['owner']
const TEACHER: readonly Role[] = ['teacher']
const STUDENT: readonly Role[] = ['student']

export const NAV_SECTIONS: NavSection[] = [
  {
    title: '운영',
    items: [
      { key: 'dashboard', label: '대시보드', path: '/admin', icon: LayoutDashboard, roles: ADMIN },
      { key: 'inquiries', label: '상담·테스트 접수', path: '/admin/inquiries', icon: Headset, roles: ADMIN, badgeKey: 'inquiries' },
      { key: 'consultCalendar', label: '상담 달력', path: '/admin/consult-calendar', icon: CalendarDays, roles: ADMIN },
      { key: 'students', label: '학생', path: '/admin/students', icon: GraduationCap, roles: ADMIN },
      { key: 'timetables', label: '시간표 조회', path: '/admin/timetables', icon: CalendarRange, roles: ADMIN },
      { key: 'levelTests', label: '레벨테스트 결과', path: '/admin/level-tests', icon: ClipboardCheck, roles: ADMIN, badgeKey: 'levelTests' },
      { key: 'placement', label: '반 배정', path: '/admin/placement', icon: Waypoints, roles: OWNER },
    ],
  },
  {
    title: '리포트',
    items: [
      { key: 'reports', label: '리포트 승인', path: '/admin/reports', icon: Send, roles: ADMIN, badgeKey: 'reports' },
      { key: 'reportSchedules', label: '리포트 일정', path: '/admin/report-schedules', icon: CalendarClock, roles: ADMIN },
      { key: 'notifications', label: '발송 이력', path: '/admin/notifications', icon: SendHorizontal, roles: ADMIN },
    ],
  },
  {
    title: '수업',
    items: [
      { key: 'teacherDashboard', label: '강사 대시보드', path: '/t/dashboard', icon: LayoutDashboard, roles: TEACHER },
      { key: 'teacherTimetable', label: '내 시간표', path: '/t/timetable', icon: CalendarRange, roles: TEACHER, exact: true },
      { key: 'attendance', label: '출석부', path: '/t/attendance', icon: ClipboardList, roles: TEACHER },
      { key: 'teacherHomework', label: '보충 숙제', path: '/t/homework', icon: NotebookPen, roles: TEACHER },
      { key: 'feedback', label: '오답 피드백 검수', path: '/t/feedback', icon: MessageSquareText, roles: TEACHER, badgeKey: 'feedbacks' },
      { key: 'teacherMessages', label: '학생 질문', path: '/t/messages', icon: MessageCircleQuestion, roles: TEACHER, badgeKey: 'messages' },
    ],
  },
  {
    title: '학습',
    items: [
      { key: 'myTimetable', label: '내 시간표', path: '/s/timetable', icon: CalendarRange, roles: STUDENT, exact: true },
      { key: 'myHomework', label: '내 숙제', path: '/s/homework', icon: NotebookPen, roles: STUDENT, exact: true },
      { key: 'myMessages', label: '선생님께 질문', path: '/s/messages', icon: MessageCircleQuestion, roles: STUDENT, exact: true },
    ],
  },
  {
    title: '설정',
    items: [
      { key: 'classes', label: '반 구성', path: '/admin/classes', icon: Users, roles: ADMIN },
      { key: 'aiJobs', label: 'AI 처리 이력', path: '/admin/ai-jobs', icon: Bot, roles: OWNER },
      { key: 'users', label: '계정·권한', path: '/admin/settings/users', icon: UserCog, roles: OWNER },
      { key: 'rules', label: '룰·프롬프트', path: '/admin/settings/rules', icon: SlidersHorizontal, roles: OWNER },
    ],
  },
]

/** 역할에 보이는 메뉴만 남긴다 (빈 섹션 제거). exact 메뉴(본인 기준 화면)는 대표에게도 숨긴다. */
export function navSectionsFor(role: Role | undefined): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) =>
      item.exact ? role !== undefined && item.roles.includes(role) : hasRole(role, item.roles),
    ),
  })).filter((section) => section.items.length > 0)
}
