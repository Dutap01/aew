import {
  CalendarDays,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Headset,
  LayoutDashboard,
  type LucideIcon,
  NotebookPen,
  Presentation,
  Settings,
  Users,
  UsersRound,
  Send,
} from 'lucide-react'

export interface NavItem {
  key: string
  label: string
  path: string
  icon: LucideIcon
  /** ShellSummary.badges 에서 숫자를 가져올 key */
  badgeKey?: string
  tag?: string
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'MENU',
    items: [
      { key: 'dashboard', label: '대시보드', path: '/', icon: LayoutDashboard },
      { key: 'consultations', label: '상담 접수', path: '/consultations', icon: Headset, badgeKey: 'consultations' },
      { key: 'levelTests', label: '레벨테스트', path: '/level-tests', icon: ClipboardCheck, badgeKey: 'levelTests' },
      { key: 'diagnoses', label: '진단서', path: '/diagnoses', icon: FileText },
      { key: 'homework', label: '숙제', path: '/homework', icon: NotebookPen, tag: 'NEW' },
      { key: 'reports', label: '학부모 리포트', path: '/reports', icon: Send },
    ],
  },
  {
    title: '학생 관리',
    items: [
      { key: 'students', label: '학생', path: '/students', icon: GraduationCap },
      { key: 'parents', label: '학부모', path: '/parents', icon: UsersRound },
      { key: 'classes', label: '반 편성', path: '/classes', icon: Users },
    ],
  },
  {
    title: 'WORKSPACE',
    items: [
      { key: 'schedule', label: '일정', path: '/schedule', icon: CalendarDays },
      { key: 'teachers', label: '강사', path: '/teachers', icon: Presentation },
      { key: 'settings', label: '설정', path: '/settings', icon: Settings },
    ],
  },
]

export const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items)

/** 하단 고정 메뉴(알림)용 경로 */
export const NOTIFICATIONS_PATH = '/notifications'
