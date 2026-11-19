import { Search } from 'lucide-react'
import { type FormEvent, type ReactNode, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuthStore } from '@/stores/authStore'
import { formatToday } from '@/utils/format'

interface TopbarProps {
  title: string
  subtitle?: ReactNode
  /** 상단 학생 빠른 검색을 숨긴다 (학생 화면처럼 자체 검색창이 있는 화면) */
  hideSearch?: boolean
}

export function Topbar({ title, subtitle, hideSearch }: TopbarProps) {
  const role = useAuthStore((s) => s.user?.role)
  // 학생 검색은 대표·상담실장만 (/api/admin/students)
  const canSearch = !hideSearch && (role === 'owner' || role === 'counselor')

  return (
    <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">{title}</h1>
        <p className="mt-1 text-xs text-muted tabular-nums">{subtitle ?? formatToday()}</p>
      </div>
      {canSearch && <QuickStudentSearch />}
    </header>
  )
}

/** Enter 를 누르면 학생 화면으로 이동해 검색 결과를 보여준다 */
function QuickStudentSearch() {
  const navigate = useNavigate()
  const [value, setValue] = useState('')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const q = value.trim()
    navigate(q ? `/admin/students?q=${encodeURIComponent(q)}` : '/admin/students')
  }

  return (
    <form role="search" onSubmit={onSubmit} className="relative block w-full md:w-72">
      <label htmlFor="quick-student-search" className="sr-only">
        학생 빠른 검색
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        id="quick-student-search"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="학생 이름·코드 검색 후 Enter"
        className="h-10 w-full rounded-full border border-line bg-white pr-4 pl-10 text-sm text-ink shadow-card outline-none placeholder:text-muted/80 focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
    </form>
  )
}
