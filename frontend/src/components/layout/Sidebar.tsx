import { ChevronsLeft, ChevronsRight, LogOut } from 'lucide-react'
import { motion } from 'motion/react'
import { NavLink, useNavigate } from 'react-router'
import { navSectionsFor, type NavItem } from '@/router/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { CountBadge, TagBadge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/utils/cn'
import { ROLE_LABEL } from '@/utils/role'
import type { ShellSummary } from '@/types/dashboard'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  summary: ShellSummary | null
}

export function Sidebar({ collapsed, onToggle, summary }: SidebarProps) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const sections = navSectionsFor(user?.role)
  const isAdmin = user?.role === 'owner' || user?.role === 'counselor'

  async function onLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside
      className={cn(
        'sticky top-0 flex h-dvh shrink-0 flex-col py-5 text-white transition-[width] duration-300 ease-out',
        collapsed ? 'w-sidebar-collapsed px-3' : 'w-sidebar px-4',
      )}
    >
      {/* 브랜드 */}
      <div className={cn('mb-6 flex items-center gap-2.5', collapsed ? 'flex-col' : 'px-1')}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-800 shadow-sm">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden>
            <path d="M4 18 L9 6 L14 18 M6 13 H12 M15 6 V18 H20" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-extrabold leading-tight">LMS</p>
            <p className="truncate text-[11px] text-white/70">{summary?.academyName ?? ' '}</p>
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
          aria-expanded={!collapsed}
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
        >
          {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
        </button>
      </div>

      {/* 메뉴 */}
      <nav aria-label="주 메뉴" className="-mx-1 flex-1 space-y-5 overflow-y-auto px-1 [scrollbar-width:none]">
        {sections.map((section) => (
          <div key={section.title}>
            {collapsed ? (
              <div className="mx-auto mb-2 h-px w-6 bg-white/25" aria-hidden />
            ) : (
              <p className="mb-1.5 px-3 text-[10.5px] font-semibold tracking-[0.12em] text-white/55">{section.title}</p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.key}>
                  <SidebarLink item={item} collapsed={collapsed} badge={item.badgeKey ? summary?.badges[item.badgeKey] : undefined} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* 하단 */}
      <div className="mt-4 space-y-1">
        {!collapsed && isAdmin && summary && (
          <div className="mb-3 rounded-2xl bg-white/12 p-3.5 ring-1 ring-white/15 backdrop-blur-sm">
            <p className="text-[11px] text-white/75">이번 달 숙제 제출률</p>
            <p className="mt-0.5 text-xl font-extrabold tabular-nums">{summary.monthlyHomeworkRate}%</p>
            <ProgressBar
              value={summary.monthlyHomeworkRate}
              className="mt-2"
              trackClassName="bg-white/20"
              barClassName="bg-white"
              label="이번 달 숙제 제출률"
            />
          </div>
        )}
        <div className={cn('mt-3 flex items-center gap-2.5 border-t border-white/15 pt-4', collapsed ? 'flex-col' : 'px-1')}>
          <Avatar name={user?.name ?? ' '} size={34} colorClassName="bg-white text-brand-800" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold">{user?.name}</p>
              <p className="truncate text-[11px] text-white/65">{user ? ROLE_LABEL[user.role] : ''}</p>
            </div>
          )}
          <button
            type="button"
            onClick={onLogout}
            title="로그아웃"
            aria-label="로그아웃"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}

interface SidebarLinkProps {
  item: NavItem
  collapsed: boolean
  badge?: number
  /** 활성 pill 을 표시하지 않는 보조 링크 */
  quiet?: boolean
}

function SidebarLink({ item, collapsed, badge, quiet }: SidebarLinkProps) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.path}
      end={item.path === '/admin'}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'relative flex h-10 items-center gap-3 rounded-full text-[13.5px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-white',
          collapsed ? 'justify-center px-0' : 'px-3',
          isActive && !quiet ? 'text-brand-800' : 'text-white/90 hover:bg-white/10 hover:text-white',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && !quiet && (
            <motion.span
              layoutId="sidebar-active-pill"
              className="absolute inset-0 rounded-full bg-white shadow-sm"
              transition={{ type: 'spring', stiffness: 500, damping: 38 }}
            />
          )}
          <Icon className="relative size-[18px] shrink-0" strokeWidth={isActive && !quiet ? 2.4 : 2} aria-hidden />
          {!collapsed && <span className={cn('relative flex-1 truncate', isActive && !quiet && 'font-bold')}>{item.label}</span>}
          {!collapsed && badge ? <CountBadge count={badge} className="relative" /> : null}
          {!collapsed && item.tag && (
            <TagBadge label={item.tag} className={cn('relative', isActive && 'bg-brand text-white')} />
          )}
          {collapsed && (badge || item.tag) ? (
            <span className="absolute top-1.5 right-2.5 size-2 rounded-full bg-alert ring-2 ring-brand" aria-hidden />
          ) : null}
        </>
      )}
    </NavLink>
  )
}
