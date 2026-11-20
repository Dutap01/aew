// 시간표 조회 (대표·상담실장): 학생 또는 강사를 검색해 고르면 개인 주간 시간표를 보여준다.
// 재원생이 많아 목록 대신 검색으로 고른다. 고른 사람·주는 주소(?student= | ?teacher=, &week=)에 남긴다.
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Search, UserRound } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { errorMessage } from '@/api/errors'
import { searchStudents } from '@/api/students'
import { getStudentTimetable, getTeacherTimetable, getTimetableTeachers } from '@/api/timetables'
import { Topbar } from '@/components/layout/Topbar'
import { mondayOf, WeekTimetable } from '@/components/timetable/WeekTimetable'
import { Card } from '@/components/ui/Card'
import { StudentStatusBadge } from '@/components/ui/StudentStatusBadge'
import { Toggle } from '@/components/ui/Toggle'
import { cn } from '@/utils/cn'
import { todaySeoul } from '@/utils/seoulDate'
import { useDebouncedValue } from '@/utils/useDebouncedValue'

type Kind = 'student' | 'teacher'
const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)

export function TimetablesView() {
  const [params, setParams] = useSearchParams()
  const studentId = params.get('student')
  const teacherId = params.get('teacher')
  const week = mondayOf(isDate(params.get('week')) ? params.get('week')! : todaySeoul())
  const [kind, setKind] = useState<Kind>(teacherId ? 'teacher' : 'student')

  function select(next: { student?: string; teacher?: string }) {
    const p = new URLSearchParams()
    if (next.student) p.set('student', next.student)
    if (next.teacher) p.set('teacher', next.teacher)
    if (params.get('week')) p.set('week', params.get('week')!)
    setParams(p)
  }

  function setWeek(monday: string) {
    const p = new URLSearchParams(params)
    if (monday === mondayOf(todaySeoul())) p.delete('week')
    else p.set('week', monday)
    setParams(p, { replace: true })
  }

  const timetable = useQuery({
    queryKey: ['timetable', studentId ? 'student' : 'teacher', studentId ?? teacherId, week],
    queryFn: () => (studentId ? getStudentTimetable(studentId, week) : getTeacherTimetable(teacherId!, week)),
    enabled: !!(studentId || teacherId),
  })
  const owner = timetable.data?.owner

  return (
    <>
      <Topbar title="시간표 조회" subtitle="학생·강사의 주간 수업 시간표 (반 구성과 반 소속에서 계산)" hideSearch />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Card hoverLift={false} className="self-start">
          <Toggle ariaLabel="찾을 대상" variant="subtle" value={kind} onChange={setKind} className="mb-3"
            options={[{ value: 'student', label: '학생' }, { value: 'teacher', label: '강사' }]} />
          {kind === 'student'
            ? <StudentPicker selectedId={studentId} onSelect={(id) => select({ student: id })} />
            : <TeacherPicker selectedId={teacherId} onSelect={(id) => select({ teacher: id })} />}
        </Card>

        <Card hoverLift={false} index={1} className="min-w-0">
          {!studentId && !teacherId ? (
            <div className="flex min-h-80 flex-col items-center justify-center gap-2 text-center">
              <Search className="size-7 text-muted" aria-hidden />
              <p className="text-sm font-bold text-ink">학생이나 강사를 고르세요</p>
              <p className="text-xs text-muted">이름·학생 코드로 검색하면 그 사람의 주간 시간표가 나옵니다.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-extrabold text-ink">
                    {owner?.name ?? ' '}
                    {owner && <span className="ml-2 text-xs font-semibold text-muted">{owner.kind === 'student' ? '학생' : '강사'}</span>}
                  </h2>
                  {owner?.detail && <p className="text-xs text-muted">{owner.detail}</p>}
                </div>
                {owner?.kind === 'student' && (
                  <Link to={`/admin/students/${owner.id}`} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
                    학생 정보 <ExternalLink className="size-3" aria-hidden />
                  </Link>
                )}
              </div>
              <WeekTimetable week={week} onWeekChange={setWeek} data={timetable.data} isLoading={timetable.isLoading}
                error={timetable.isError ? errorMessage(timetable.error, '시간표를 불러오지 못했습니다.') : undefined}
                secondLine={(e) => (e.teacherName ?? (e.studentCount !== null ? `학생 ${e.studentCount}명` : null))}
                classHref={(e) => `/admin/classes?class=${e.classId}`}
                emptyText={owner?.kind === 'teacher' ? '이번 주 담당 수업이 없습니다.' : '이번 주 수업이 없습니다. 반 소속을 확인하세요.'} />
            </>
          )}
        </Card>
      </div>
    </>
  )
}

const SEARCH_INPUT = 'h-10 w-full rounded-xl border border-line bg-white pr-3 pl-9 text-sm text-ink outline-none placeholder:text-muted/80 focus:border-brand focus:ring-2 focus:ring-brand/20'

function PickerInput({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="relative mb-2 block">
      <span className="sr-only">{placeholder}</span>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input id={id} type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={SEARCH_INPUT} />
    </label>
  )
}

function PickItem({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-current={selected || undefined}
      className={cn('flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left', selected ? 'bg-brand-50 ring-1 ring-brand/40' : 'hover:bg-panel')}>
      {children}
    </button>
  )
}

function StudentPicker({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const [input, setInput] = useState('')
  const q = useDebouncedValue(input.trim())
  // 검색어가 없으면 재원생 앞부분을 보여준다
  const result = useQuery({
    queryKey: ['students', { q, status: q ? undefined : 'enrolled', page: 0, size: 12 }],
    queryFn: () => searchStudents({ q, status: q ? undefined : 'enrolled', page: 0, size: 12 }),
  })

  return (
    <>
      <PickerInput id="tt-student" value={input} onChange={setInput} placeholder="이름·학생 코드·학교" />
      {result.isError ? (
        <p role="alert" className="text-xs text-alert">{errorMessage(result.error)}</p>
      ) : !result.data ? (
        <div className="h-40 animate-pulse rounded-xl bg-track" />
      ) : result.data.items.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted">검색 결과가 없습니다.</p>
      ) : (
        <>
          <ul className="space-y-0.5">
            {result.data.items.map((s) => (
              <li key={s.id}>
                <PickItem selected={s.id === selectedId} onClick={() => onSelect(s.id)}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink">{s.name} <span className="font-mono text-[11px] font-normal text-muted">{s.studentCode}</span></span>
                    <span className="block truncate text-[11px] text-muted">{s.classes.join(', ') || '반 없음'}</span>
                  </span>
                  <StudentStatusBadge status={s.status} />
                </PickItem>
              </li>
            ))}
          </ul>
          {result.data.total > result.data.items.length && (
            <p className="mt-2 text-center text-[11px] text-muted">
              {q ? `${result.data.total}명 중 ${result.data.items.length}명. 검색어를 더 자세히 넣으세요.` : '이름으로 검색해 다른 학생을 찾으세요.'}
            </p>
          )}
        </>
      )}
    </>
  )
}

function TeacherPicker({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const [input, setInput] = useState('')
  const teachers = useQuery({ queryKey: ['teachers'], queryFn: getTimetableTeachers, staleTime: 5 * 60_000 })
  const list = (teachers.data ?? []).filter((t) => t.name.includes(input.trim()))

  return (
    <>
      <PickerInput id="tt-teacher" value={input} onChange={setInput} placeholder="강사 이름" />
      {teachers.isError ? (
        <p role="alert" className="text-xs text-alert">{errorMessage(teachers.error)}</p>
      ) : !teachers.data ? (
        <div className="h-32 animate-pulse rounded-xl bg-track" />
      ) : list.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted">강사가 없습니다.</p>
      ) : (
        <ul className="space-y-0.5">
          {list.map((t) => (
            <li key={t.id}>
              <PickItem selected={t.id === selectedId} onClick={() => onSelect(t.id)}>
                <UserRound className="size-4 text-muted" aria-hidden />
                <span className="text-sm font-bold text-ink">{t.name}</span>
              </PickItem>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
